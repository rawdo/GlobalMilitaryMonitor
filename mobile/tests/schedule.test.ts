import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  freshnessSeconds,
  retryAfterSeconds,
  scheduleAfterFailure,
  scheduleAfterSuccess,
} from '../src/lib/schedule.ts';

const headers = (h: Record<string, string>) => ({ get: (name: string) => h[name.toLowerCase()] ?? null });
const limits = { minIntervalMs: 30_000, maxIntervalMs: 900_000 };

test('freshness from Cache-Control, minus Age', () => {
  assert.equal(freshnessSeconds(headers({ 'cache-control': 'max-age=300, must-revalidate' })), 300);
  assert.equal(freshnessSeconds(headers({ 'cache-control': 'public, max-age=300', age: '30' })), 270);
  assert.equal(freshnessSeconds(headers({ 'cache-control': 'no-cache' })), 0);
  assert.equal(freshnessSeconds(headers({})), null);
});

test('freshness from Expires relative to Date', () => {
  const h = headers({ date: 'Fri, 30 Oct 2026 09:00:00 GMT', expires: 'Fri, 30 Oct 2026 09:02:00 GMT' });
  assert.equal(freshnessSeconds(h), 120);
});

test('success schedules at the source cache lifetime, clamped', () => {
  // Defense News / NYT / Al Jazeera: 5 minutes.
  assert.equal(scheduleAfterSuccess(headers({ 'cache-control': 'max-age=300' }), limits).delayMs, 300_000);
  // BBC says 4 seconds: floored at our minimum.
  const bbc = scheduleAfterSuccess(headers({ 'cache-control': 'public, max-age=4' }), limits);
  assert.equal(bbc.delayMs, 30_000);
  assert.match(bbc.reason, /minimum/);
  // A day-long cache is capped.
  assert.equal(scheduleAfterSuccess(headers({ 'cache-control': 'max-age=86400' }), limits).delayMs, 900_000);
  // No hints (GDELT): minimum interval.
  assert.equal(scheduleAfterSuccess(headers({}), { ...limits, minIntervalMs: 60_000 }).delayMs, 60_000);
});

test('failures honour Retry-After, otherwise back off exponentially', () => {
  assert.equal(retryAfterSeconds(headers({ 'retry-after': '120' })), 120);
  assert.equal(scheduleAfterFailure(429, headers({ 'retry-after': '120' }), 1, limits).delayMs, 120_000);
  assert.equal(scheduleAfterFailure(429, headers({}), 1, limits).delayMs, 30_000);
  assert.equal(scheduleAfterFailure(500, headers({}), 2, limits).delayMs, 60_000);
  assert.equal(scheduleAfterFailure(null, null, 3, limits).delayMs, 120_000);
  assert.equal(scheduleAfterFailure(null, null, 20, limits).delayMs, 900_000);
});
