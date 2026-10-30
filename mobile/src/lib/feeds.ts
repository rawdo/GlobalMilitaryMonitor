// Live data feeds, ported from the desktop app's IDataFeedService implementations.

import { XMLParser } from 'fast-xml-parser';
import {
  assessSeverity,
  categorize,
  guessLocation,
  hashId,
  isMilitaryRelated,
  parseGdeltDate,
  stripHtml,
} from './classify';
import { KNOWN_DEPLOYMENTS } from './seed';
import { SEVERITY_RANK, type GeoEvent, type MilitaryAsset } from './types';

const USER_AGENT = 'GlobalMilitaryMonitor-Mobile/1.0';
const TIMEOUT_MS = 15_000;

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function buildEvent(
  title: string,
  description: string,
  timestamp: string,
  source: string,
  sourceUrl: string,
): GeoEvent {
  const text = `${title} ${description}`;
  const severity = assessSeverity(text);
  const location = guessLocation(text);
  return {
    id: hashId(sourceUrl || title),
    title,
    description,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    timestamp,
    category: categorize(text),
    severity,
    source,
    sourceUrl,
    country: location?.country ?? 'Unknown',
    isAlert: SEVERITY_RANK[severity] >= SEVERITY_RANK.High,
  };
}

// --- GDELT -------------------------------------------------------------------

const GDELT_DOC_URL =
  'https://api.gdeltproject.org/api/v2/doc/doc?query=(military%20OR%20conflict%20OR%20missile%20OR%20war%20OR%20troops)%20sourcelang:english&mode=ArtList&format=json&maxrecords=75&timespan=6h&sort=DateDesc';

export async function fetchGdeltEvents(): Promise<GeoEvent[]> {
  const body = await fetchText(GDELT_DOC_URL);
  let json: { articles?: { title?: string; url?: string; domain?: string; seendate?: string }[] };
  try {
    json = JSON.parse(body);
  } catch {
    // GDELT returns plain-text errors (e.g. rate limiting) with a 200 status.
    throw new Error(body.slice(0, 120) || 'Invalid response');
  }
  return (json.articles ?? [])
    .filter((a) => a.title)
    .map((a) =>
      buildEvent(
        stripHtml(a.title!),
        `Reported by ${a.domain ?? 'unknown source'}`,
        parseGdeltDate(a.seendate),
        a.domain ?? 'GDELT',
        a.url ?? '',
      ),
    );
}

// --- RSS ---------------------------------------------------------------------

export const RSS_FEEDS: { name: string; url: string }[] = [
  { name: 'Defense News', url: 'https://www.defensenews.com/feed/' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
];

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function textOf(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in (node as object)) return String((node as { '#text': unknown })['#text']);
  return '';
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Parses an RSS 2.0 or Atom document into military-related events. */
export function parseRss(xml: string, sourceName: string): GeoEvent[] {
  const doc = xmlParser.parse(xml);
  const items: Record<string, unknown>[] = asArray(doc?.rss?.channel?.item ?? doc?.feed?.entry);
  const events: GeoEvent[] = [];
  for (const item of items.slice(0, 30)) {
    const title = stripHtml(textOf(item.title));
    const description = stripHtml(textOf(item.description ?? item.summary));
    if (!title || !isMilitaryRelated(`${title} ${description}`)) continue;

    const link = item.link;
    const url =
      typeof link === 'object' && link && '@_href' in link
        ? String((link as { '@_href': string })['@_href'])
        : textOf(Array.isArray(link) ? link[0] : link);
    const date = new Date(textOf(item.pubDate ?? item.published ?? item.updated));
    const timestamp = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();

    events.push(
      buildEvent(
        title,
        description.length > 280 ? `${description.slice(0, 280)}…` : description,
        timestamp,
        sourceName,
        url,
      ),
    );
  }
  return events;
}

export async function fetchRssFeed(feed: { name: string; url: string }): Promise<GeoEvent[]> {
  return parseRss(await fetchText(feed.url), feed.name);
}

// --- Military assets ---------------------------------------------------------

/**
 * Live ADS-B tracking requires an API key with most providers, so the mobile app
 * currently shows the same known OSINT deployments the desktop app falls back to.
 */
export async function fetchMilitaryAssets(): Promise<MilitaryAsset[]> {
  return KNOWN_DEPLOYMENTS;
}
