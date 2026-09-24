import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app.js';
import connectDB from './config/db.js';
import { startCronJobs } from './jobs/expiry.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.user.id}`);
});

app.set('io', io);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startCronJobs(app);
    });
  })
  .catch((err) => {
    console.error(`\n❌ [MongoDB Error] Cannot connect to: ${process.env.MONGO_URI}`);
    console.error(`Reason: ${err.message}`);
    console.error(`\nTo fix this, make sure MongoDB is running:\n- Option 1 (Cloud): Paste your MongoDB Atlas URI in server/.env\n- Option 2 (Docker): Start Docker Desktop & run: docker run -d -p 27017:27017 --name mongo mongo:latest\n- Option 3 (Windows): Run 'net start MongoDB' if installed locally.\n`);
  });

