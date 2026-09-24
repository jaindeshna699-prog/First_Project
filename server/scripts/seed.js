import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Org from '../src/models/Org.js';
import Donation from '../src/models/Donation.js';
import { riskScore } from '../src/services/risk.js';

// Configurable city center (Default: New Delhi)
const CITY_NAME = process.env.SEED_CITY || 'New Delhi';
const CENTER_LAT = parseFloat(process.env.SEED_LAT) || 28.6139;
const CENTER_LNG = parseFloat(process.env.SEED_LNG) || 77.2090;

function randomCoords(radiusKm = 10) {
  // ~1 degree lat ≈ 111km, 1 degree lng ≈ 111km * cos(lat)
  const r = (radiusKm / 111) * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const lat = CENTER_LAT + r * Math.sin(theta);
  const lng = CENTER_LNG + (r * Math.cos(theta)) / Math.cos((CENTER_LAT * Math.PI) / 180);
  return [Math.round(lng * 100000) / 100000, Math.round(lat * 100000) / 100000];
}

async function seed() {
  await connectDB();
  console.log(`[Seed] Connected to MongoDB. Seeding data around ${CITY_NAME} (${CENTER_LAT}, ${CENTER_LNG})...`);

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Org.deleteMany({}),
    Donation.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Admin (1)
  const admin = await User.create({
    name: 'Chief Administrator',
    email: 'admin@shelter.org',
    passwordHash,
    role: 'admin',
    phone: '+1 555-0100',
    location: { type: 'Point', coordinates: [CENTER_LNG, CENTER_LAT] },
  });

  // 2. Donors (5)
  const donorNames = [
    'Green Garden Bistro',
    'Artisan Bakery & Cafe',
    'Grand Central Hotel Banquets',
    'Organic Harvest Market',
    'Sunrise Catering Co.',
  ];

  const donors = [];
  for (let i = 0; i < donorNames.length; i++) {
    const coords = randomCoords(8);
    const donor = await User.create({
      name: donorNames[i],
      email: `donor${i + 1}@example.com`,
      passwordHash,
      role: 'donor',
      phone: `+1 555-011${i}`,
      location: { type: 'Point', coordinates: coords },
    });
    donors.push(donor);
  }

  // 3. Orgs (4)
  const orgProfiles = [
    { name: 'Hope City Shelter', capacity: 250, hours: '08:00 - 22:00', cats: ['cooked', 'bakery', 'produce'] },
    { name: 'Community Care Kitchen', capacity: 180, hours: '09:00 - 21:00', cats: ['cooked', 'meat', 'dairy'] },
    { name: 'Safe Haven Food Bank', capacity: 350, hours: '24/7', cats: [] },
    { name: 'St. Jude Emergency Pantry', capacity: 150, hours: '07:00 - 19:00', cats: ['packaged', 'bakery', 'produce'] },
  ];

  const orgs = [];
  for (let i = 0; i < orgProfiles.length; i++) {
    const coords = randomCoords(10);
    const user = await User.create({
      name: orgProfiles[i].name,
      email: `org${i + 1}@shelter.org`,
      passwordHash,
      role: 'recipient',
      phone: `+1 555-012${i}`,
      location: { type: 'Point', coordinates: coords },
    });

    const org = await Org.create({
      userId: user._id,
      name: orgProfiles[i].name,
      capacityKgPerDay: orgProfiles[i].capacity,
      usedKgToday: Math.floor(Math.random() * 60) + 15,
      acceptedCategories: orgProfiles[i].cats,
      location: { type: 'Point', coordinates: coords },
      openHours: orgProfiles[i].hours,
    });
    orgs.push({ user, org });
  }

  // 4. Drivers (3)
  const driverNames = ['Alex Morgan (Van 1)', 'Sam Rivera (EV 2)', 'Jordan Lee (Courier 3)'];
  const drivers = [];
  for (let i = 0; i < driverNames.length; i++) {
    const coords = randomCoords(6);
    const driver = await User.create({
      name: driverNames[i],
      email: `driver${i + 1}@dispatch.com`,
      passwordHash,
      role: 'driver',
      phone: `+1 555-013${i}`,
      location: { type: 'Point', coordinates: coords },
    });
    drivers.push(driver);
  }

  // 5. ~40 Donations across last 14 days with mixed statuses
  const foodItems = [
    { title: 'Buffet Trays: Rice, Dal & Veggies', cat: 'cooked', qty: 25 },
    { title: 'Fresh Sourdough & Baguettes', cat: 'bakery', qty: 15 },
    { title: 'Crated Organic Apples & Pears', cat: 'produce', qty: 30 },
    { title: 'Packaged Dairy Milk & Yogurt Cartons', cat: 'dairy', qty: 20 },
    { title: 'Roasted Chicken & Steamed Vegetables', cat: 'cooked', qty: 35 },
    { title: 'Whole Wheat Buns & Croissants', cat: 'bakery', qty: 12 },
    { title: 'Fresh Tomatoes, Lettuce & Cucumbers', cat: 'produce', qty: 28 },
    { title: 'Assorted Canned Soups & Beans', cat: 'packaged', qty: 45 },
    { title: 'Cold-Pressed Juices & Milk Bottles', cat: 'beverages', qty: 18 },
    { title: 'Curry & Flatbread Catering Trays', cat: 'cooked', qty: 40 },
    { title: 'Artisan Pastries & Muffins', cat: 'bakery', qty: 10 },
    { title: 'Bulk Potatoes & Carrots', cat: 'produce', qty: 50 },
  ];

  const statuses = [
    // Delivered (~24)
    'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered',
    'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered',
    'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered',
    'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered',
    // Active / In-progress (~10)
    'picked_up', 'picked_up', 'picked_up',
    'accepted', 'accepted', 'accepted', 'accepted',
    'matched', 'matched', 'matched',
    // Side states (~6)
    'unmatched', 'unmatched',
    'cancelled', 'cancelled',
    'expired', 'expired',
  ];

  const donations = [];
  const now = Date.now();

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const food = foodItems[i % foodItems.length];
    const donor = donors[i % donors.length];
    const matchedOrg = orgs[i % orgs.length].org;
    const driver = drivers[i % drivers.length];

    // Distribute across last 14 days
    const dayOffset = Math.floor((i / statuses.length) * 13.8); // 0 to 13 days ago
    const hoursOffset = (i % 24) + Math.random() * 2;
    const createdAt = new Date(now - (dayOffset * 86400000 + hoursOffset * 3600000));
    const expiresAt = new Date(createdAt.getTime() + (Math.floor(Math.random() * 6) + 4) * 3600000);

    const coords = randomCoords(9);
    const timeline = [{ status: 'posted', at: createdAt }];

    let assignedOrgId = null;
    let assignedDriverId = null;

    if (['matched', 'accepted', 'picked_up', 'delivered'].includes(status)) {
      assignedOrgId = matchedOrg._id;
      timeline.push({ status: 'matched', at: new Date(createdAt.getTime() + 10 * 60000) });
    }

    if (['accepted', 'picked_up', 'delivered'].includes(status)) {
      timeline.push({ status: 'accepted', at: new Date(createdAt.getTime() + 25 * 60000) });
    }

    if (['picked_up', 'delivered'].includes(status)) {
      assignedDriverId = driver._id;
      timeline.push({ status: 'picked_up', at: new Date(createdAt.getTime() + 60 * 60000) });
    }

    if (status === 'delivered') {
      timeline.push({ status: 'delivered', at: new Date(createdAt.getTime() + 90 * 60000) });
    }

    if (status === 'cancelled') {
      timeline.push({ status: 'cancelled', at: new Date(createdAt.getTime() + 30 * 60000) });
    }

    if (status === 'expired') {
      timeline.push({ status: 'expired', at: expiresAt });
    }

    if (status === 'unmatched') {
      timeline.push({ status: 'unmatched', at: new Date(createdAt.getTime() + 15 * 60000) });
    }

    const doc = new Donation({
      donorId: donor._id,
      title: `${food.title} #${i + 1}`,
      category: food.cat,
      quantityKg: food.qty + (i % 5) * 2,
      description: 'Well-packed surplus food ready for urgent shelter distribution.',
      expiresAt,
      pickupLocation: { type: 'Point', coordinates: coords },
      status,
      matchedOrgId: assignedOrgId,
      driverId: assignedDriverId,
      riskScore: 0,
      timeline,
      createdAt,
      updatedAt: createdAt,
    });

    doc.riskScore = riskScore(doc);
    donations.push(doc);
  }

  await Donation.insertMany(donations);

  console.log(`[Seed] Completed successfully:`);
  console.log(`- 1 Admin: admin@shelter.org / password123`);
  console.log(`- 5 Donors: donor1@example.com .. donor5@example.com / password123`);
  console.log(`- 4 Orgs: org1@shelter.org .. org4@shelter.org / password123`);
  console.log(`- 3 Drivers: driver1@dispatch.com .. driver3@dispatch.com / password123`);
  console.log(`- ${donations.length} Donations across last 14 days around ${CITY_NAME}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
