const PERISHABILITY = {
  cooked: 90,
  dairy: 80,
  meat: 85,
  seafood: 95,
  produce: 60,
  bakery: 50,
  packaged: 20,
  canned: 10,
  beverages: 15,
};

export function riskScore(donation) {
  const categoryRisk = PERISHABILITY[donation.category?.toLowerCase()] ?? 40;

  const msLeft = new Date(donation.expiresAt).getTime() - Date.now();
  const hoursLeft = msLeft / 3_600_000;

  let timeRisk;
  if (hoursLeft <= 1) timeRisk = 100;
  else if (hoursLeft <= 3) timeRisk = 80;
  else if (hoursLeft <= 6) timeRisk = 60;
  else if (hoursLeft <= 12) timeRisk = 40;
  else if (hoursLeft <= 24) timeRisk = 20;
  else timeRisk = 10;

  return Math.round(0.6 * categoryRisk + 0.4 * timeRisk);
}
