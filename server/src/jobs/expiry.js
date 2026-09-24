import cron from 'node-cron';
import Donation from '../models/Donation.js';
import { findBestOrg } from '../services/matching.js';
import { notifyExpired, notifyMatched } from '../services/notify.js';

export function startCronJobs(app) {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const expired = await Donation.find({
        expiresAt: { $lte: now },
        status: { $in: ['posted', 'matched', 'unmatched', 'accepted'] },
      });

      for (const d of expired) {
        d.status = 'expired';
        d.timeline.push({ status: 'expired', at: now });
        await d.save();
        await notifyExpired({ app }, d);
      }

      if (expired.length) console.log(`[cron] Expired ${expired.length} donations`);

      const unmatched = await Donation.find({
        status: 'unmatched',
        expiresAt: { $gt: now },
      });

      for (const d of unmatched) {
        const ranked = await findBestOrg(d);
        if (ranked.length > 0) {
          d.status = 'matched';
          d.matchedOrgId = ranked[0].orgId;
          d.rankedOrgs = ranked.slice(1).map(r => r.orgId);
          d.timeline.push({ status: 'matched', at: now });
          await d.save();
          await notifyMatched({ app }, d);
        }
      }

      if (unmatched.length) console.log(`[cron] Retried matching for ${unmatched.length} unmatched donations`);
    } catch (err) {
      console.error('[cron] Error:', err.message);
    }
  });
}
