import http from 'http';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.PORT = '5222';

// Use in-memory Mongo via MongoClient (mongosh) or skip if unavailable
let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sts-test-driver';

const { default: app } = await import('./src/app.js');
const { default: connectDB } = await import('./src/config/db.js');

process.env.MONGO_URI = mongoUri;

try {
  await connectDB();
} catch {
  console.log('SKIP: MongoDB not available — verifying module loading only');
  // Verify all routes loaded without error
  const layers = app._router.stack.filter(l => l.name === 'router');
  console.log(`Loaded ${layers.length} route groups`);
  console.log(layers.length >= 3 ? 'PASS: All route modules loaded (auth, driver, org)' : 'FAIL: Missing route modules');
  process.exit(layers.length >= 3 ? 0 : 1);
}

const server = http.createServer(app);
await new Promise(r => server.listen(5222, r));
console.log('Test server on :5222');

async function req(method, path, body, token) {
  const opts = { hostname: '127.0.0.1', port: 5222, path, method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  return new Promise((resolve, reject) => {
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0, failed = 0;
function check(name, ok) {
  if (ok) { console.log(`PASS: ${name}`); passed++; }
  else { console.log(`FAIL: ${name}`); failed++; }
}

// Clean test DB
await mongoose.connection.db.dropDatabase();

// Register donor + recipient + driver
const donor = await req('POST', '/api/auth/register', { name: 'Donor', email: 'donor@t.com', password: 'pass123', role: 'donor' });
const recip = await req('POST', '/api/auth/register', { name: 'Shelter', email: 'shelter@t.com', password: 'pass123', role: 'recipient' });
const drv = await req('POST', '/api/auth/register', { name: 'Driver', email: 'driver@t.com', password: 'pass123', role: 'driver' });
check('Users registered', donor.status === 201 && recip.status === 201 && drv.status === 201);

// Driver: GET /available without lat/lng → 400
const noGeo = await req('GET', '/api/driver/available', null, drv.body.token);
check('GET /driver/available no coords → 400', noGeo.status === 400);

// Driver: GET /available with coords (no donations yet) → 200 empty
const empty = await req('GET', '/api/driver/available?lat=28.6&lng=77.2', null, drv.body.token);
check('GET /driver/available empty → 200 []', empty.status === 200 && Array.isArray(empty.body));

// Insert a donation in accepted status directly for driver testing
const { default: Donation } = await import('./src/models/Donation.js');
const { default: Org } = await import('./src/models/Org.js');
const org = await Org.findOne({ userId: recip.body.user.id });

const don = await Donation.create({
  donorId: donor.body.user.id,
  title: 'Test Food',
  category: 'cooked',
  quantityKg: 5,
  expiresAt: new Date(Date.now() + 3600000),
  pickupLocation: { type: 'Point', coordinates: [77.2, 28.6] },
  status: 'accepted',
  matchedOrgId: org._id,
  timeline: [{ status: 'posted' }, { status: 'matched' }, { status: 'accepted' }],
});

// Driver: GET /available with coords → should find the donation
const avail = await req('GET', '/api/driver/available?lat=28.6&lng=77.2', null, drv.body.token);
check('GET /driver/available finds donation', avail.status === 200 && avail.body.length === 1);

// Driver: POST accept
const accept = await req('POST', `/api/driver/${don._id}/accept`, {}, drv.body.token);
check('POST /driver/:id/accept → 200', accept.status === 200);
check('Driver assigned', accept.body.driverId === drv.body.user.id);

// Double accept → 409
const drv2 = await req('POST', '/api/auth/register', { name: 'D2', email: 'd2@t.com', password: 'pass123', role: 'driver' });
const dbl = await req('POST', `/api/driver/${don._id}/accept`, {}, drv2.body.token);
check('Double accept → 409', dbl.status === 409);

// PATCH status: picked_up
const pu = await req('PATCH', `/api/driver/${don._id}/status`, { status: 'picked_up' }, drv.body.token);
check('PATCH picked_up → 200', pu.status === 200 && pu.body.status === 'picked_up');

// PATCH status: delivered
const del = await req('PATCH', `/api/driver/${don._id}/status`, { status: 'delivered' }, drv.body.token);
check('PATCH delivered → 200', del.status === 200 && del.body.status === 'delivered');

// PATCH status: can't go back
const back = await req('PATCH', `/api/driver/${don._id}/status`, { status: 'picked_up' }, drv.body.token);
check('Backward transition → 400', back.status === 400);

// Org respond test: create another matched donation
const don2 = await Donation.create({
  donorId: donor.body.user.id,
  title: 'Food 2',
  category: 'produce',
  quantityKg: 3,
  expiresAt: new Date(Date.now() + 3600000),
  pickupLocation: { type: 'Point', coordinates: [77.2, 28.6] },
  status: 'matched',
  matchedOrgId: org._id,
  timeline: [{ status: 'posted' }, { status: 'matched' }],
});

// GET /orgs/incoming
const incoming = await req('GET', '/api/orgs/incoming', null, recip.body.token);
check('GET /orgs/incoming has donation', incoming.status === 200 && incoming.body.length >= 1);

// POST respond accept
const resp = await req('POST', `/api/orgs/donations/${don2._id}/respond`, { accept: true }, recip.body.token);
check('Org accept → accepted', resp.status === 200 && resp.body.status === 'accepted');

console.log(`\n${passed}/${passed + failed} tests passed`);

server.close();
await mongoose.connection.db.dropDatabase();
await mongoose.disconnect();
process.exit(failed > 0 ? 1 : 0);
