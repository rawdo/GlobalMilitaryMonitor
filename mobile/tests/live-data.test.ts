import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeAircraft, parseAircraft } from '../src/lib/aircraft';
import { parseGdelt, parseRss } from '../src/lib/feeds';
import { analyzeHotspots } from '../src/lib/hotspots';
import { countryOfIcao } from '../src/lib/icao';
import { SOURCES } from '../src/lib/sources';
import type { GeoEvent, MilitaryAsset, SeverityLevel } from '../src/lib/types';

// Same cases as the desktop tests (tests/GlobalMilitaryMonitor.Tests), so both apps behave identically.

test('ICAO address blocks', () => {
  assert.equal(countryOfIcao('ae145a'), 'United States');
  assert.equal(countryOfIcao('43c6f1'), 'United Kingdom');
  assert.equal(countryOfIcao('3e8e7c'), 'Germany');
  assert.equal(countryOfIcao('508035'), 'Ukraine');
  assert.equal(countryOfIcao('~2a01c3'), 'Unknown');
  assert.equal(countryOfIcao('zzzz'), 'Unknown');
});

test('aircraft: live positions only, stale and unpositioned dropped', () => {
  const body = JSON.stringify({
    now: 1793350000000,
    ac: [
      { hex: 'ae145a', flight: 'RCH6156 ', r: '06-6156', t: 'C17', desc: 'Boeing C-17A Globemaster III', alt_baro: 34000, gs: 400, track: 279, lat: 38.69, lon: -89.3, seen_pos: 3.3 },
      { hex: 'ae5f01', t: 'Q4', alt_baro: 'ground', lat: 39, lon: -77, seen_pos: 1 },
      { hex: '43c6f1', flight: 'RRR123', t: 'A400', lat: 51, lon: -1, seen_pos: 600 },
      { hex: '3e8e7c', flight: 'GAF001', t: 'A400' },
    ],
  });
  const assets = parseAircraft(body, 'adsb.lol');
  assert.equal(assets.length, 2);
  assert.equal(assets[0].name, 'RCH6156 (Boeing C-17A Globemaster III)');
  assert.equal(assets[0].country, 'United States');
  assert.equal(assets[0].status, '34,000 ft · 400 kn');
  assert.equal(assets[0].lastSeen, new Date(1793350000000 - 3300).toISOString());
  assert.equal(assets[1].type, 'Drone');
  assert.equal(assets[1].status, 'on ground');
  assert.throws(() => parseAircraft('{"ac":[]}', 'x'), /now/);
});

test('aircraft merge keeps the freshest position per ICAO address', () => {
  const a = (id: string, latitude: number, lastSeen: string) => ({ id, latitude, lastSeen }) as MilitaryAsset;
  const merged = mergeAircraft([
    [a('ae0001', 1, '2026-10-30T00:00:00Z'), a('ae0002', 0, '2026-10-30T00:00:00Z')],
    [a('ae0001', 2, '2026-10-30T00:00:05Z')],
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((x) => x.id === 'ae0001')?.latitude, 2);
});

const ev = (title: string, country: string, severity: SeverityLevel, hoursAgo: number, source = 'Test'): GeoEvent => ({
  id: title,
  title,
  description: '',
  latitude: country === 'Unknown' ? null : 1,
  longitude: country === 'Unknown' ? null : 2,
  timestamp: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
  category: 'Conflict',
  severity,
  source,
  sourceUrl: '',
  country,
  isAlert: false,
});
const NOW = Date.UTC(2026, 9, 30, 12);

test('hotspots are derived from recent, located reports', () => {
  const events: GeoEvent[] = [];
  for (let i = 0; i < 16; i++) events.push(ev(`u${i}`, 'Ukraine', i < 2 ? 'High' : 'Medium', 1, i % 2 ? 'B' : 'A'));
  for (let i = 0; i < 3; i++) events.push(ev(`s${i}`, 'Sudan', 'Low', 2));
  for (let i = 0; i < 2; i++) events.push(ev(`m${i}`, 'Mali', 'Low', 2)); // too few
  for (let i = 0; i < 5; i++) events.push(ev(`o${i}`, 'Iraq', 'High', 30)); // too old
  for (let i = 0; i < 5; i++) events.push(ev(`x${i}`, 'Unknown', 'High', 0)); // no location
  for (let i = 0; i < 5; i++) events.push(ev(`p${i}`, 'United States', 'Medium', 0)); // institutional

  const hotspots = analyzeHotspots(events, NOW);
  assert.deepEqual(hotspots.map((h) => h.name), ['Ukraine', 'Sudan']);
  assert.equal(hotspots[0].intensity, 'High');
  assert.equal(hotspots[0].reportCount, 16);
  assert.equal(hotspots[0].highSeverityCount, 2);
  assert.deepEqual(hotspots[0].sources, ['A', 'B']);
  assert.equal(hotspots[1].intensity, 'Low');
});

test('RSS items and GDELT articles without a date are skipped, never stamped "now"', () => {
  const bbc = SOURCES.find((s) => s.id === 'bbc-world')!;
  const xml = `<rss><channel>
    <item><title>Troops deploy without a date</title><link>https://example.com/c</link></item>
    <item><title>Missile test reported</title><link>https://example.com/d</link><pubDate>Fri, 30 Oct 2026 04:29:22 -0400</pubDate></item>
  </channel></rss>`;
  assert.deepEqual(parseRss(xml, bbc).map((e) => e.title), ['Missile test reported']);

  const gdelt = JSON.stringify({
    articles: [
      { url: 'https://example.com/1', title: 'Military drills near Taiwan', seendate: '20261030T081500Z', domain: 'example.com' },
      { url: 'https://example.com/2', title: 'No date here', domain: 'example.com' },
    ],
  });
  assert.deepEqual(parseGdelt(gdelt).map((e) => e.title), ['Military drills near Taiwan']);
});

test('catalog: 35 news sources + 2 aircraft sources, unique ids and URLs', () => {
  assert.equal(SOURCES.filter((s) => s.kind !== 'aircraft').length, 35);
  assert.equal(SOURCES.filter((s) => s.kind === 'aircraft').length, 2);
  assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length);
  assert.equal(new Set(SOURCES.map((s) => s.url)).size, SOURCES.length);
});
