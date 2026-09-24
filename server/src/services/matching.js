import Org from '../models/Org.js';

const MAX_DIST = 15_000; // 15 km in metres
const SPEED_KMH = 25;
const BUFFER_MIN = 30;

function travelMinutes(distMetres) {
  return (distMetres / 1000) / SPEED_KMH * 60;
}

function passesExpiryFilter(distMetres, expiresAt) {
  const travelMin = travelMinutes(distMetres);
  const neededMs = (travelMin + BUFFER_MIN) * 60_000;
  return Date.now() + neededMs <= new Date(expiresAt).getTime();
}

function scoreCandidate(org, distMetres, donation) {
  const distNorm = 1 - distMetres / MAX_DIST;
  const remaining = org.capacityKgPerDay - org.usedKgToday;
  const capNorm = remaining / org.capacityKgPerDay;

  const hoursLeft = (new Date(donation.expiresAt).getTime() - Date.now()) / 3_600_000;
  const urgency = hoursLeft <= 3 ? 1 : hoursLeft <= 6 ? 0.7 : hoursLeft <= 12 ? 0.4 : 0.2;

  return 0.5 * distNorm + 0.3 * capNorm + 0.2 * urgency;
}

export async function findBestOrg(donation) {
  const [lng, lat] = donation.pickupLocation.coordinates;

  const candidates = await Org.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'dist',
        maxDistance: MAX_DIST,
        spherical: true,
      },
    },
    {
      $match: {
        $or: [
          { acceptedCategories: { $size: 0 } },
          { acceptedCategories: donation.category },
        ],
        $expr: {
          $gte: [
            { $subtract: ['$capacityKgPerDay', '$usedKgToday'] },
            donation.quantityKg,
          ],
        },
      },
    },
  ]);

  const safe = candidates.filter(c => passesExpiryFilter(c.dist, donation.expiresAt));

  const scored = safe.map(c => ({
    org: c,
    score: scoreCandidate(c, c.dist, donation),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(s => ({ orgId: s.org._id, userId: s.org.userId, score: s.score, dist: s.org.dist }));
}

export { passesExpiryFilter, scoreCandidate, travelMinutes, MAX_DIST, BUFFER_MIN, SPEED_KMH };
