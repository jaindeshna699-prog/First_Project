import { Router } from 'express';
import { z } from 'zod';
import Org from '../models/Org.js';
import Donation from '../models/Donation.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import { notifyAccepted, notifyMatched, notifyDriversNewJob } from '../services/notify.js';

const router = Router();

const respondSchema = z.object({
  accept: z.boolean(),
});

router.get('/me', auth, requireRole('recipient'), async (req, res, next) => {
  try {
    const org = await Org.findOne({ userId: req.user.id });
    if (!org) { const err = new Error('Org not found'); err.status = 404; throw err; }
    res.json(org);
  } catch (err) { next(err); }
});

router.put('/me', auth, requireRole('recipient'), async (req, res, next) => {
  try {
    const org = await Org.findOneAndUpdate({ userId: req.user.id }, req.body, { new: true, runValidators: true });
    if (!org) { const err = new Error('Org not found'); err.status = 404; throw err; }
    res.json(org);
  } catch (err) { next(err); }
});

router.get('/incoming', auth, requireRole('recipient'), async (req, res, next) => {
  try {
    const org = await Org.findOne({ userId: req.user.id });
    if (!org) { const err = new Error('Org not found'); err.status = 404; throw err; }
    const donations = await Donation.find({ matchedOrgId: org._id, status: 'matched' });
    res.json(donations);
  } catch (err) { next(err); }
});

router.post('/donations/:id/respond', auth, requireRole('recipient'), validate(respondSchema), async (req, res, next) => {
  try {
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
