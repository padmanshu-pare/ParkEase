const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword } = require('../services/password');
const { floorBucket, bucketsBetween, BUCKET_MS } = require('../services/availability');
const { withinOpeningHours } = require('../services/reservations');

test('password: accepts a strong password', () => {
  assert.equal(validatePassword('Strong1pass'), null);
});

test('password: rejects short, letter-only, number-only, and common passwords', () => {
  assert.match(validatePassword('Ab1'), /at least 8/);
  assert.match(validatePassword('abcdefgh'), /letter and one number/);
  assert.match(validatePassword('12345678'), /letter and one number/);
  assert.match(validatePassword('password1'), /too common/);
});

test('bucket: floors a time to its 30-minute block', () => {
  const t = new Date('2026-11-14T10:17:00Z');
  assert.equal(floorBucket(t).toISOString(), '2026-11-14T10:00:00.000Z');
});

test('bucket: a 90-minute window covers three blocks', () => {
  const start = new Date('2026-11-14T10:00:00Z');
  const end = new Date(start.getTime() + 90 * 60000);
  assert.equal(bucketsBetween(start, end).length, 3);
  assert.equal(BUCKET_MS, 30 * 60000);
});

test('opening hours: normal facility (08:00 to 22:00, IST)', () => {
  // 10:00 IST = 04:30 UTC
  const ok = withinOpeningHours(new Date('2026-11-14T04:30:00Z'), new Date('2026-11-14T06:30:00Z'), '08:00', '22:00');
  assert.equal(ok, true);
  // 21:30 IST to 22:30 IST crosses closing time
  const late = withinOpeningHours(new Date('2026-11-14T16:00:00Z'), new Date('2026-11-14T17:00:00Z'), '08:00', '22:00');
  assert.equal(late, false);
});

test('opening hours: overnight facility (08:00 to 02:00)', () => {
  // 23:30 IST to 00:30 IST next day
  const ok = withinOpeningHours(new Date('2026-11-14T18:00:00Z'), new Date('2026-11-14T19:00:00Z'), '08:00', '02:00');
  assert.equal(ok, true);
  // 03:00 IST is closed
  const closed = withinOpeningHours(new Date('2026-11-14T21:30:00Z'), new Date('2026-11-14T22:30:00Z'), '08:00', '02:00');
  assert.equal(closed, false);
});

test('opening hours: no hours set means no restriction', () => {
  assert.equal(withinOpeningHours(new Date(), new Date(Date.now() + 3600000), undefined, undefined), true);
});
