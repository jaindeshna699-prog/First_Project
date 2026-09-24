import { Router } from 'express';
import Donation from '../models/Donation.js';
import auth from '../middleware/auth.js';
import { MEALS_PER_KG, CO2E_PER_KG } from '../config/impact.js';

const router = Router();

router.get('/summary', auth, async (req, res, next) => {
  try {
    const [stats] = await Donation.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalDonations: { $sum: 1 },
                totalKgDelivered: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'delivered'] }, '$quantityKg', 0],
                  },
                },
                deliveredCount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
                  },
                },
                activeCount: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['posted', 'matched', 'accepted', 'picked_up']] },
                      1,
                      0,
                    ],
                  },
                },
                terminalCount: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['delivered', 'cancelled', 'expired']] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalKg: { $sum: '$quantityKg' },
                deliveredKg: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'delivered'] }, '$quantityKg', 0],
                  },
                },
              },
            },
            { $sort: { totalKg: -1 } },
          ],
          hotspots: [
            {
              $project: {
                title: 1,
                category: 1,
                quantityKg: 1,
                status: 1,
                coordinates: '$pickupLocation.coordinates',
                createdAt: 1,
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 100 },
          ],
        },
      },
    ]);

    const totals = stats.totals[0] || {
      totalDonations: 0,
      totalKgDelivered: 0,
      deliveredCount: 0,
      activeCount: 0,
      terminalCount: 0,
    };

    const totalKgDelivered = Math.round(totals.totalKgDelivered * 10) / 10;
    const meals = Math.round(totalKgDelivered * MEALS_PER_KG);
    const co2eAvoided = Math.round(totalKgDelivered * CO2E_PER_KG * 10) / 10;
    const successRate =
      totals.totalDonations > 0
        ? Math.round((totals.deliveredCount / totals.totalDonations) * 100)
        : 0;

    res.json({
      totalKgDelivered,
      meals,
      co2eAvoided,
      activeDonations: totals.activeCount,
      totalDonations: totals.totalDonations,
      deliveredDonations: totals.deliveredCount,
      successRate,
      byCategory: stats.byCategory.map((c) => ({
        category: c._id,
        count: c.count,
        totalKg: Math.round(c.totalKg * 10) / 10,
        deliveredKg: Math.round(c.deliveredKg * 10) / 10,
      })),
      hotspots: stats.hotspots.map((h) => ({
        id: h._id,
        title: h.title,
        category: h.category,
        quantityKg: h.quantityKg,
        status: h.status,
        lat: h.coordinates?.[1],
        lng: h.coordinates?.[0],
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/timeseries', auth, async (req, res, next) => {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const agg = await Donation.aggregate([
      {
        $match: {
          createdAt: { $gte: fourteenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          totalKg: { $sum: '$quantityKg' },
          deliveredKg: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, '$quantityKg', 0],
            },
          },
          count: { $sum: 1 },
          deliveredCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const aggMap = new Map(agg.map((item) => [item._id, item]));

    // Fill all 14 days
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = aggMap.get(key);

      const deliveredKg = found ? Math.round(found.deliveredKg * 10) / 10 : 0;
      const totalKg = found ? Math.round(found.totalKg * 10) / 10 : 0;

      result.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        kgDelivered: deliveredKg,
        totalKg,
        meals: Math.round(deliveredKg * MEALS_PER_KG),
        co2e: Math.round(deliveredKg * CO2E_PER_KG * 10) / 10,
        donations: found ? found.count : 0,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
