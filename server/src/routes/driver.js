import { Router } from 'express';
import { z } from 'zod';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import { notifyStatus, notifyPickedUp, notifyDelivered } from '../services/notify.js';

const router = Router();

const TWENTY_KM = 20_000;

const statusSchema = z.object({
  status: z.enum(['picked_up', 'delivered']),
});

const VALID_TRANSITIONS = {
  accepted: 'picked_up',
  picked_up: 'delivered',
};

router.get('/available', auth, requireRole('driver'), async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      const err = new Error('lat and lng query params required');
      err.status = 400;
      throw err;
    }

    const donations = await Donation.find({
      status: 'accepted',
      driverId: null,
      pickupLocation: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: TWENTY_KM,
        },
      },
    }).sort({ expiresAt: 1 }).populate('matchedOrgId');

    res.json(donations);
  } catch (err) { next(err); }
});

router.get('/route-plan', auth, requireRole('driver'), async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      const err = new Error('lat and lng query params required');
      err.status = 400;
      throw err;
    }
    const { planDriverRoute } = await import('../services/routePlanner.js');
    const plan = await planDriverRoute(lat, lng, 3);
    res.json(plan);
  } catch (err) { next(err); }
});

router.get('/active', auth, requireRole('driver'), async (req, res, next) => {
  try {
    const donation = await Donation.findOne({
      driverId: req.user.id,
      status: { $in: ['accepted', 'picked_up'] },
    }).populate('matchedOrgId');
    res.json(donation);
  } catch (err) { next(err); }
});

router.post('/:donationId/accept', auth, requireRole('driver'), async (req, res, next) => {
  try {
    const donation = await Donation.findOneAndUpdate(
      { _id: req.params.donationId, status: 'accepted', driverId: null },
      {
        $set: { driverId: req.user.id },
        $push: { timeline: { status: 'picked_up_assigned', at: new Date() } },
      },
      { new: true },
    ).populate('matchedOrgId');

    if (!donation) {
      const err = new Error('Donation not available or already taken');
      err.status = 409;
      throw err;
    }

    await notifyStatus(req, donation, 'driver_assigned');
    res.json(donation);
  } catch (err) { next(err); }
});

router.patch('/:donationId/status', auth, requireRole('driver'), validate(statusSchema), async (req, res, next) => {
  try {
    const { status } = req.body;
    const donation = await Donation.findOne({
      _id: req.params.donationId,
      driverId: req.user.id,
    });

    if (!donation) {
      const err = new Error('Donation not found or not assigned to you');
      err.status = 404;
      throw err;
    }

    if (VALID_TRANSITIONS[donation.status] !== status) {
      const err = new Error(`Cannot transition from ${donation.status} to ${status}`);
      err.status = 400;
      throw err;
    }

    donation.status = status;
    donation.timeline.push({ status, at: new Date() });
    await donation.save();

    if (status === 'picked_up') await notifyPickedUp(req, donation);
    if (status === 'delivered') await notifyDelivered(req, donation);

    res.json(donation);
  } catch (err) { next(err); }
});

export default router;
