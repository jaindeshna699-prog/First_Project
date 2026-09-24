import { Router } from 'express';
import { z } from 'zod';
import Donation from '../models/Donation.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import { riskScore } from '../services/risk.js';
import { findBestOrg } from '../services/matching.js';
import { notifyMatched } from '../services/notify.js';

const router = Router();

const createSchema = z.object({
  title:       z.string().min(1),
  category:    z.string().min(1),
  quantityKg:  z.number().positive(),
  description: z.string().optional(),
  expiresAt:   z.string().datetime(),
  pickupLocation: z.object({
    coordinates: z.array(z.number()).length(2),
  }),
});

const parseSchema = z.object({
  text: z.string().min(1),
});

router.post('/parse', auth, requireRole('donor'), validate(parseSchema), async (req, res, next) => {
  try {
    const { text } = req.body;
    const { parseDonationWithGemini } = await import('../services/aiParser.js');
    const result = await parseDonationWithGemini(text);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('donor'), validate(createSchema), async (req, res, next) => {
  try {
    const data = req.body;
    data.donorId = req.user.id;
    data.pickupLocation = { type: 'Point', coordinates: data.pickupLocation.coordinates };

    const donation = new Donation(data);
    donation.riskScore = riskScore(donation);

    const ranked = await findBestOrg(donation);

    if (ranked.length > 0) {
      donation.status = 'matched';
      donation.matchedOrgId = ranked[0].orgId;
      donation.rankedOrgs = ranked.slice(1).map(r => r.orgId);
      donation.timeline.push({ status: 'matched', at: new Date() });
    } else {
      donation.status = 'unmatched';
      donation.timeline.push({ status: 'unmatched', at: new Date() });
    }

    await donation.save();

    if (donation.status === 'matched') {
      await notifyMatched(req, donation);
    }

    res.status(201).json(donation);
  } catch (err) { next(err); }
});

router.get('/mine', auth, async (req, res, next) => {
  try {
    const donations = await Donation.find({ donorId: req.user.id }).sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) { next(err); }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) { const err = new Error('Not found'); err.status = 404; throw err; }
    res.json(donation);
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', auth, requireRole('donor'), async (req, res, next) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donorId: req.user.id });
    if (!donation) { const err = new Error('Not found'); err.status = 404; throw err; }

    if (['picked_up', 'delivered', 'cancelled', 'expired'].includes(donation.status)) {
      const err = new Error(`Cannot cancel donation in ${donation.status} status`);
      err.status = 400;
      throw err;
    }

    donation.status = 'cancelled';
    donation.timeline.push({ status: 'cancelled', at: new Date() });
    await donation.save();

    res.json(donation);
  } catch (err) { next(err); }
});

router.post('/:id/respond', auth, requireRole('recipient'), validate(z.object({ accept: z.boolean() })), async (req, res, next) => {
  try {
    const Org = (await import('../models/Org.js')).default;
    const { notifyAccepted, notifyDriversNewJob } = await import('../services/notify.js');

    const org = await Org.findOne({ userId: req.user.id });
    if (!org) { const err = new Error('Org not found'); err.status = 404; throw err; }

    const donation = await Donation.findOne({ _id: req.params.id, matchedOrgId: org._id, status: 'matched' });
    if (!donation) { const err = new Error('Donation not found or not matched to your org'); err.status = 404; throw err; }

    if (req.body.accept) {
      donation.status = 'accepted';
      donation.timeline.push({ status: 'accepted', at: new Date() });
      donation.rankedOrgs = [];
      await donation.save();

      org.usedKgToday += donation.quantityKg;
      await org.save();

      await notifyAccepted(req, donation);
      notifyDriversNewJob(req, donation);
    } else {
      const fallbacks = donation.rankedOrgs || [];
      if (fallbacks.length > 0) {
        const nextOrgId = fallbacks[0];
        donation.matchedOrgId = nextOrgId;
        donation.rankedOrgs = fallbacks.slice(1);
        donation.timeline.push({ status: 'matched', at: new Date() });
        await donation.save();
        await notifyMatched(req, donation);
      } else {
        donation.status = 'unmatched';
        donation.matchedOrgId = null;
        donation.rankedOrgs = [];
        donation.timeline.push({ status: 'unmatched', at: new Date() });
        await donation.save();
      }
    }

    res.json(donation);
  } catch (err) { next(err); }
});

export default router;
