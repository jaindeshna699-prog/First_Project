import Donation from '../models/Donation.js';

const SPEED_KMH = 25;
const SERVICE_TIME_MIN = 5;
const TWENTY_FIVE_KM = 25_000;

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function travelMin(distMeters) {
  return (distMeters / 1000 / SPEED_KMH) * 60;
}

export async function planDriverRoute(startLat, startLng, maxStops = 3) {
  const candidates = await Donation.find({
    status: 'accepted',
    driverId: null,
    pickupLocation: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [startLng, startLat] },
        $maxDistance: TWENTY_FIVE_KM,
      },
    },
  }).populate('matchedOrgId');

  let unvisited = [...candidates];
  let currentPos = { lat: startLat, lng: startLng };
  let currentTimeMs = Date.now();

  const stops = [];
  const polyline = [[startLat, startLng]];
  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;

  while (stops.length < maxStops && unvisited.length > 0) {
    let best = null;
    let bestIndex = -1;
    let bestDist = Infinity;
    let bestEtaMs = 0;

    for (let i = 0; i < unvisited.length; i++) {
      const item = unvisited[i];
      const [itemLng, itemLat] = item.pickupLocation.coordinates;
      const dist = distanceMeters(currentPos.lat, currentPos.lng, itemLat, itemLng);
      const tMin = travelMin(dist);
      const etaMs = currentTimeMs + tMin * 60_000;
      const expiryMs = new Date(item.expiresAt).getTime();

      // Expiry constraint: must arrive before expiry (with 10m buffer if possible, or before expiry)
      if (etaMs + 10 * 60_000 <= expiryMs) {
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
          bestIndex = i;
          bestEtaMs = etaMs;
        }
      }
    }

    // Fallback: relax 10m buffer to 0 if none found
    if (!best) {
      for (let i = 0; i < unvisited.length; i++) {
        const item = unvisited[i];
        const [itemLng, itemLat] = item.pickupLocation.coordinates;
        const dist = distanceMeters(currentPos.lat, currentPos.lng, itemLat, itemLng);
        const tMin = travelMin(dist);
        const etaMs = currentTimeMs + tMin * 60_000;
        const expiryMs = new Date(item.expiresAt).getTime();

        if (etaMs <= expiryMs && dist < bestDist) {
          bestDist = dist;
          best = item;
          bestIndex = i;
          bestEtaMs = etaMs;
        }
      }
    }

    if (!best) break; // No more reachable donations before expiry

    const distKm = Math.round((bestDist / 1000) * 10) / 10;
    const tMinutes = Math.round(travelMin(bestDist));
    const [bestLng, bestLat] = best.pickupLocation.coordinates;

    stops.push({
      stopNumber: stops.length + 1,
      donationId: best._id,
      title: best.title,
      category: best.category,
      quantityKg: best.quantityKg,
      lat: bestLat,
      lng: bestLng,
      distanceFromPrevKm: distKm,
      travelMinutes: tMinutes,
      eta: new Date(bestEtaMs).toISOString(),
      expiresAt: best.expiresAt,
      dropoffOrg: best.matchedOrgId
        ? {
            name: best.matchedOrgId.name,
            lat: best.matchedOrgId.location?.coordinates?.[1],
            lng: best.matchedOrgId.location?.coordinates?.[0],
          }
        : null,
    });

    polyline.push([bestLat, bestLng]);
    totalDistanceKm += distKm;
    totalDurationMinutes += tMinutes + SERVICE_TIME_MIN;
    currentTimeMs = bestEtaMs + SERVICE_TIME_MIN * 60_000;
    currentPos = { lat: bestLat, lng: bestLng };

    unvisited.splice(bestIndex, 1);
  }

  return {
    driverLocation: { lat: startLat, lng: startLng },
    totalStops: stops.length,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalDurationMinutes: Math.round(totalDurationMinutes),
    stops,
    polyline,
  };
}
