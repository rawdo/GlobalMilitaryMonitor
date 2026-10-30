// Keyword-based categorisation, severity assessment and geolocation, ported from
// GdeltNewsFeedService / RssDefenseNewsFeedService in the desktop app.
// Kept free of runtime imports so it can be unit tested directly with Node.

import type { EventCategory, SeverityLevel } from './types';

const CATEGORY_RULES: [EventCategory, string[]][] = [
  ['MissileLaunch', ['missile', 'rocket', 'launch']],
  ['NavalActivity', ['navy', 'naval', 'ship', 'fleet']],
  ['AirActivity', ['aircraft', 'jet', 'air force', 'drone']],
  ['MilitaryMovement', ['troops', 'troop', 'military', 'army', 'deploy']],
  ['NuclearActivity', ['nuclear', 'uranium', 'atomic']],
  ['CyberAttack', ['cyber', 'hack']],
  ['Sanctions', ['sanction', 'embargo']],
  ['Diplomacy', ['diplomat', 'treaty', 'summit', 'negotiat']],
  ['Terrorism', ['terror', 'bombing', 'suicide bomb', 'improvised explosive']],
  ['Conflict', ['conflict', 'war', 'fight', 'battle', 'strike', 'attack', 'shelling']],
];

export function categorize(text: string): EventCategory {
  const lower = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return 'Other';
}

// "nuclear" alone is too broad (power plants, energy policy), so Critical needs a weapons context.
const CRITICAL_RE = /\b(icbm|wmd|warheads?|nuclear (test|strike|attack|weapons?|threat|missile|war|launch))/i;

export function assessSeverity(text: string): SeverityLevel {
  const lower = text.toLowerCase();
  if (CRITICAL_RE.test(lower)) return 'Critical';
  if (['missile launch', 'invasion', 'war declared', 'casualties'].some((k) => lower.includes(k)))
    return 'High';
  if (['military', 'conflict', 'strike', 'attack'].some((k) => lower.includes(k))) return 'Medium';
  return 'Low';
}

const MILITARY_KEYWORDS = [
  'military', 'war', 'conflict', 'missile', 'troops', 'army', 'navy', 'air force',
  'nuclear', 'weapon', 'strike', 'attack', 'defense', 'defence', 'drone', 'bomb', 'bombing',
  'combat', 'battlefield', 'invasion', 'sanction', 'nato', 'pentagon', 'soldier',
  'tank', 'fighter jet', 'warship', 'submarine', 'cyber attack', 'terrorist',
  'airstrike', 'ceasefire', 'casualties', 'ammunition', 'artillery', 'garrison',
];

// Whole-word match (allowing plurals) so e.g. "war" does not match "award" or "warning".
const MILITARY_RE = new RegExp(`\\b(?:${MILITARY_KEYWORDS.join('|')})(?:s|es)?\\b`, 'i');

export function isMilitaryRelated(text: string): boolean {
  return MILITARY_RE.test(text);
}

// Ordered: cities and specific regions first, so "Russian strike on Kharkiv" maps to Ukraine and
// "North Korea" wins over "Korea". Names match whole words plus common demonym endings
// ("Russian", "Israeli", "Malian" but not "Malibu"); a trailing * marks a stem matched as a prefix.
const LOCATIONS: [string, number, number, string][] = [
  ['North Korea', 40.34, 127.51, 'North Korea'],
  ['Pyongyang', 39.04, 125.76, 'North Korea'],
  ['South Korea', 35.91, 127.77, 'South Korea'],
  ['Seoul', 37.57, 126.98, 'South Korea'],
  ['South China Sea', 12.0, 114.0, 'South China Sea'],
  ['Red Sea', 20.0, 38.0, 'Red Sea'],
  ['Black Sea', 43.4, 34.0, 'Black Sea'],
  ['Gaza', 31.35, 34.31, 'Palestine'],
  ['West Bank', 31.9, 35.2, 'Palestine'],
  ['Kyiv', 50.45, 30.52, 'Ukraine'],
  ['Kharkiv', 49.99, 36.23, 'Ukraine'],
  ['Kherson', 46.64, 32.62, 'Ukraine'],
  ['Odesa', 46.48, 30.72, 'Ukraine'],
  ['Donetsk', 48.02, 37.8, 'Ukraine'],
  ['Zaporizhzhia', 47.84, 35.14, 'Ukraine'],
  ['Crimea', 45.3, 34.4, 'Ukraine'],
  ['Ukrain*', 48.38, 31.17, 'Ukraine'],
  ['Moscow', 55.76, 37.62, 'Russia'],
  ['Kremlin', 55.75, 37.62, 'Russia'],
  ['Russia', 61.52, 105.32, 'Russia'],
  ['Taipei', 25.03, 121.57, 'Taiwan'],
  ['Taiwan', 23.7, 120.96, 'Taiwan'],
  ['Beijing', 39.9, 116.4, 'China'],
  ['China', 35.86, 104.2, 'China'],
  ['Chinese', 35.86, 104.2, 'China'],
  ['Tehran', 35.69, 51.39, 'Iran'],
  ['Iran', 32.43, 53.69, 'Iran'],
  ['Beirut', 33.89, 35.5, 'Lebanon'],
  ['Hezbollah', 33.85, 35.86, 'Lebanon'],
  ['Lebanon', 33.85, 35.86, 'Lebanon'],
  ['Hamas', 31.35, 34.31, 'Palestine'],
  ['Palestin*', 31.9, 35.2, 'Palestine'],
  ['Israel', 31.05, 34.85, 'Israel'],
  ['Damascus', 33.51, 36.29, 'Syria'],
  ['Syria', 34.8, 38.99, 'Syria'],
  ['Houthi', 15.55, 48.52, 'Yemen'],
  ['Yemen', 15.55, 48.52, 'Yemen'],
  ['Baghdad', 33.31, 44.36, 'Iraq'],
  ['Iraq', 33.22, 43.68, 'Iraq'],
  ['Japan', 36.2, 138.25, 'Japan'],
  ['Kabul', 34.56, 69.21, 'Afghanistan'],
  ['Afghan*', 33.94, 67.71, 'Afghanistan'],
  ['Libya', 26.34, 17.23, 'Libya'],
  ['Somali*', 5.15, 46.2, 'Somalia'],
  ['Khartoum', 15.5, 32.56, 'Sudan'],
  ['Darfur', 13.5, 24.0, 'Sudan'],
  ['South Sudan', 6.88, 31.31, 'South Sudan'],
  ['Sudan', 12.86, 30.22, 'Sudan'],
  ['Ethiopia', 9.15, 40.49, 'Ethiopia'],
  ['Congo', -1.5, 29.0, 'DR Congo'],
  ['Rwanda', -1.94, 29.87, 'Rwanda'],
  ['Sahel', 14.0, 1.0, 'Sahel'],
  ['Mali', 17.57, -4.0, 'Mali'],
  ['Myanmar', 21.91, 95.96, 'Myanmar'],
  ['Pakistan', 30.38, 69.35, 'Pakistan'],
  ['Kashmir', 34.08, 74.8, 'Kashmir'],
  ['India', 20.59, 78.96, 'India'],
  ['Venezuela', 6.42, -66.59, 'Venezuela'],
  ['Baltic', 58.0, 20.0, 'Baltic Region'],
  ['Arctic', 75.0, 30.0, 'Arctic'],
  ['NATO', 50.85, 4.35, 'NATO/Brussels'],
  ['Pentagon', 38.87, -77.06, 'United States'],
];

export interface Location {
  latitude: number;
  longitude: number;
  country: string;
}

const LOCATION_PATTERNS = LOCATIONS.map(([name, latitude, longitude, country]) => ({
  re: name.endsWith('*')
    ? new RegExp(`\\b${name.slice(0, -1)}`, 'i')
    : new RegExp(`\\b${name}(?:s|n|ns|an|ans|ian|ians|i|is|ese|'s)?\\b`, 'i'),
  location: { latitude, longitude, country },
}));

/**
 * Finds the first known place name in the text. Returns null when none matches,
 * rather than inventing random coordinates as the desktop app does.
 */
export function guessLocation(text: string): Location | null {
  return LOCATION_PATTERNS.find((p) => p.re.test(text))?.location ?? null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .trim();
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
const ZONES: Record<string, number> = { GMT: 0, UT: 0, UTC: 0, Z: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7 };

/**
 * Parses RSS (RFC 822) and Atom (ISO 8601) dates without relying on Date.parse, whose support for
 * these formats varies between JS engines. Also accepts offsets without a colon ("-0400").
 * Returns an ISO string, or null if unparseable.
 */
export function parseFeedDate(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  const offsetMinutes = (sign: string, hh: string, mm: string) => (sign === '-' ? -1 : 1) * (+hh * 60 + +mm);

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|([+-])(\d{2}):?(\d{2}))?$/i);
  if (iso) {
    const [, y, mo, d, h, mi, sec = '0', zone, sign, oh, om] = iso;
    const offset = zone && zone.toUpperCase() !== 'Z' ? offsetMinutes(sign, oh, om) : 0;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec) - offset * 60_000).toISOString();
  }

  const rfc = v.match(/^(?:[a-z]{3},?\s+)?(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:([+-])(\d{2})(\d{2})|([a-z]+))?$/i);
  if (rfc && rfc[2].toLowerCase() in MONTHS) {
    const [, d, mon, yRaw, h, mi, sec = '0', sign, oh, om, named] = rfc;
    const y = yRaw.length === 2 ? 2000 + +yRaw : +yRaw;
    const offset = sign ? offsetMinutes(sign, oh, om) : (ZONES[(named ?? 'GMT').toUpperCase()] ?? 0) * 60;
    return new Date(Date.UTC(y, MONTHS[mon.toLowerCase()], +d, +h, +mi, +sec) - offset * 60_000).toISOString();
  }

  const fallback = new Date(v);
  return isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

/** Parses GDELT "seendate" values such as 20261030T081500Z. */
export function parseGdeltDate(value: string | undefined): string | null {
  const m = value?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString();
}

/** Small stable string hash used to build deterministic ids. */
export function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
