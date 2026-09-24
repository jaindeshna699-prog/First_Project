import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  passesExpiryFilter,
  scoreCandidate,
  travelMinutes,
  MAX_DIST,
  BUFFER_MIN,
  SPEED_KMH,
} from '../src/services/matching.js';
import { riskScore } from '../src/services/risk.js';

describe('travelMinutes', () => {
  it('calculates correct travel time', () => {
    assert.equal(travelMinutes(25_000), 60);
    assert.equal(travelMinutes(12_500), 30);
    assert.equal(travelMinutes(0), 0);
  });
});

describe('passesExpiryFilter (hard filter)', () => {
  it('passes when expiry is well beyond travel + buffer', () => {
    const expiresAt = new Date(Date.now() + 4 * 3_600_000);
    assert.equal(passesExpiryFilter(10_000, expiresAt), true);
  });

  it('fails when expiry is before travel + 30min buffer', () => {
    const travelMs = travelMinutes(15_000) * 60_000;
    const bufferMs = BUFFER_MIN * 60_000;
    const expiresAt = new Date(Date.now() + travelMs + bufferMs - 60_000);
    assert.equal(passesExpiryFilter(15_000, expiresAt), false);
  });

  it('fails when food already expired', () => {
    const expiresAt = new Date(Date.now() - 60_000);
    assert.equal(passesExpiryFilter(1_000, expiresAt), false);
  });

  it('boundary: exactly at travel + buffer → passes', () => {
    const travelMs = travelMinutes(10_000) * 60_000;
    const bufferMs = BUFFER_MIN * 60_000;
    const expiresAt = new Date(Date.now() + travelMs + bufferMs);
    assert.equal(passesExpiryFilter(10_000, expiresAt), true);
  });

  it('distant org needs more travel time, may fail', () => {
    const nearExpiry = new Date(Date.now() + 40 * 60_000);
    assert.equal(passesExpiryFilter(1_000, nearExpiry), true);
    assert.equal(passesExpiryFilter(14_000, nearExpiry), false);
  });
});

describe('scoreCandidate (ranking)', () => {
  const makeDonation = (hoursLeft) => ({
    expiresAt: new Date(Date.now() + hoursLeft * 3_600_000),
  });

  const makeOrg = (capDay, usedToday) => ({
    capacityKgPerDay: capDay,
    usedKgToday: usedToday,
  });

  it('closer org scores higher than farther org', () => {
    const d = makeDonation(6);
    const close = scoreCandidate(makeOrg(100, 0), 2_000, d);
    const far = scoreCandidate(makeOrg(100, 0), 14_000, d);
    assert.ok(close > far, `close ${close} should beat far ${far}`);
  });

  it('org with more remaining capacity scores higher', () => {
    const d = makeDonation(6);
    const plenty = scoreCandidate(makeOrg(100, 10), 5_000, d);
    const full = scoreCandidate(makeOrg(100, 90), 5_000, d);
    assert.ok(plenty > full, `plenty ${plenty} should beat full ${full}`);
  });

  it('more urgent donation increases urgency component', () => {
    const urgent = makeDonation(2);
    const relaxed = makeDonation(24);
    const org = makeOrg(100, 0);
    const sU = scoreCandidate(org, 5_000, urgent);
    const sR = scoreCandidate(org, 5_000, relaxed);
    assert.ok(sU > sR, `urgent ${sU} should beat relaxed ${sR}`);
  });

  it('score is between 0 and 1', () => {
    const s = scoreCandidate(makeOrg(100, 50), 7_500, makeDonation(6));
    assert.ok(s >= 0 && s <= 1, `score ${s} out of range`);
  });
});

describe('riskScore', () => {
  it('cooked food expiring soon → high risk', () => {
    const s = riskScore({ category: 'cooked', expiresAt: new Date(Date.now() + 30 * 60_000) });
    assert.ok(s >= 80, `expected high risk, got ${s}`);
  });

  it('canned food with long expiry → low risk', () => {
    const s = riskScore({ category: 'canned', expiresAt: new Date(Date.now() + 48 * 3_600_000) });
    assert.ok(s <= 20, `expected low risk, got ${s}`);
  });

  it('returns value between 0 and 100', () => {
    const s = riskScore({ category: 'produce', expiresAt: new Date(Date.now() + 6 * 3_600_000) });
    assert.ok(s >= 0 && s <= 100, `score ${s} out of range`);
  });
});
