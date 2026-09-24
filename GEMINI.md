# Surplus-to-Shelter (AmiHacks Track A)
Goal: donor posts surplus food in <1 min -> system auto-matches best nearby recipient org (capacity, need, distance, expiry safety) -> driver dispatch -> status tracking -> impact dashboard.
Roles: donor, recipient, driver, admin.
Status flow: posted -> matched -> accepted -> picked_up -> delivered. Side states: unmatched, expired, cancelled.
Models: User{name,email,passwordHash,role,phone,location(GeoJSON Point)}; Org{userId,name,capacityKgPerDay,usedKgToday,acceptedCategories[],location(2dsphere),openHours}; Donation{donorId,title,category,quantityKg,description,expiresAt,pickupLocation(2dsphere),status,matchedOrgId,driverId,riskScore,timeline[{status,at}]}.
API (all under /api, JWT bearer): POST /auth/register, POST /auth/login, GET /auth/me | POST /donations, GET /donations/mine, GET /donations/:id, PATCH /donations/:id/cancel | GET/PUT /orgs/me, GET /orgs/incoming, POST /donations/:id/respond {accept:boolean} | GET /driver/available, POST /driver/:donationId/accept, PATCH /driver/:donationId/status | GET /impact/summary, GET /impact/timeseries.
Socket events: donation:new, donation:matched, donation:status. Rooms: user:<id>.
Rules: never match food that would expire before pickup+travel+30min buffer. Impact constants (meals per kg, CO2e per kg) live in server/src/config/impact.js.
Code style: small files, async/await, central error handler, zod validation, no comments unless non-obvious.
Agent behavior: only touch files needed for the current task. No README/docs/extra features. Keep replies under 10 lines.
