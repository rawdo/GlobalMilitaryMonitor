// Live data feeds, ported from the desktop app's IDataFeedService implementations.

import { XMLParser } from 'fast-xml-parser';
import {
  assessSeverity,
  categorize,
  guessLocation,
  hashId,
  isMilitaryRelated,
  parseFeedDate,
  parseGdeltDate,
  stripHtml,
  type Location,
} from './classify';
import type { Source } from './sources';
import { parseAircraft } from './aircraft';
import { SEVERITY_RANK, type GeoEvent, type MilitaryAsset } from './types';

const USER_AGENT = 'GlobalMilitaryMonitor-Mobile/1.0';
const TIMEOUT_MS = 15_000;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly headers: Headers,
    message: string,
  ) {
    super(message);
  }
}

/** Cache validators from the last good response, sent back so unchanged feeds answer 304. */
export interface Validators {
  etag?: string;
  lastModified?: string;
}

export type FetchResult =
  | { changed: true; events: GeoEvent[]; assets: MilitaryAsset[]; headers: Headers; validators: Validators }
  | { changed: false; headers: Headers; validators: Validators };

function buildEvent(
  title: string,
  description: string,
  timestamp: string,
  source: string,
  sourceUrl: string,
  fallbackLocation?: Location,
): GeoEvent {
  const text = `${title} ${description}`;
  const severity = assessSeverity(text);
  const location = guessLocation(text) ?? fallbackLocation;
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

export function parseGdelt(body: string): GeoEvent[] {
  let json: { articles?: { title?: string; url?: string; domain?: string; seendate?: string }[] };
  try {
    json = JSON.parse(body);
  } catch {
    // GDELT sometimes answers with a plain-text message (e.g. its rate-limit notice).
    throw new Error(body.slice(0, 120) || 'Invalid response');
  }
  const events: GeoEvent[] = [];
  for (const a of json.articles ?? []) {
    const timestamp = parseGdeltDate(a.seendate);
    // Articles without a usable date are skipped rather than stamped with the fetch time.
    if (!a.title || !timestamp) continue;
    events.push(
      buildEvent(stripHtml(a.title), `Reported by ${a.domain ?? 'unknown source'}`, timestamp, a.domain ?? 'GDELT', a.url ?? ''),
    );
  }
  return events;
}

// --- RSS ---------------------------------------------------------------------

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

type RssSource = Pick<Source, 'name' | 'militaryOnly' | 'fallbackLocation'>;

/** Parses an RSS 2.0 or Atom document into events (only military-related ones if the source asks). */
export function parseRss(xml: string, source: RssSource): GeoEvent[] {
  const doc = xmlParser.parse(xml);
  const items: Record<string, unknown>[] = asArray(doc?.rss?.channel?.item ?? doc?.feed?.entry);
  const events: GeoEvent[] = [];
  for (const item of items.slice(0, 30)) {
    const title = stripHtml(textOf(item.title));
    const description = stripHtml(textOf(item.description ?? item.summary));
    if (!title || (source.militaryOnly && !isMilitaryRelated(`${title} ${description}`))) continue;

    const link = item.link;
    const url =
      typeof link === 'object' && link && '@_href' in link
        ? String((link as { '@_href': string })['@_href'])
        : textOf(Array.isArray(link) ? link[0] : link);
    // Items without a usable date are skipped rather than stamped with the fetch time.
    const timestamp = parseFeedDate(textOf(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']));
    if (!timestamp) continue;

    events.push(
      buildEvent(
        title,
        description.length > 280 ? `${description.slice(0, 280)}…` : description,
        timestamp,
        source.name,
        url,
        source.fallbackLocation,
      ),
    );
  }
  return events;
}

// --- Fetching ----------------------------------------------------------------

export async function fetchSource(source: Source, validators: Validators): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
    if (validators.etag) headers['If-None-Match'] = validators.etag;
    if (validators.lastModified) headers['If-Modified-Since'] = validators.lastModified;

    const res = await fetch(source.url, { headers, signal: controller.signal });
    if (res.status === 304) return { changed: false, headers: res.headers, validators };
    if (!res.ok) throw new HttpError(
        res.status,
        res.headers,
        res.status === 429 ? 'Rate limited by source (HTTP 429)' : `HTTP ${res.status}`,
      );

    const body = await res.text();
    return {
      changed: true,
      events: source.kind === 'gdelt' ? parseGdelt(body) : source.kind === 'rss' ? parseRss(body, source) : [],
      assets: source.kind === 'aircraft' ? parseAircraft(body, source.name) : [],
      headers: res.headers,
      validators: {
        etag: res.headers.get('etag') ?? undefined,
        lastModified: res.headers.get('last-modified') ?? undefined,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
