import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import donationRoutes from './routes/donation.js';
import driverRoutes from './routes/driver.js';
import orgRoutes from './routes/org.js';
import impactRoutes from './routes/impact.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/impact', impactRoutes);

app.use(errorHandler);

export default app;
