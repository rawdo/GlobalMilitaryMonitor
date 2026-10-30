// Runs every feed in parallel and merges the results (the desktop DataAggregator).

import { normalizeTitle } from './classify';
import { fetchGdeltEvents, fetchMilitaryAssets, fetchRssFeed, RSS_FEEDS } from './feeds';
import { CONFLICT_ZONES } from './seed';
import type { FeedStatus, GeoEvent, MonitorSnapshot } from './types';

const MAX_EVENTS = 200;

export function mergeEvents(groups: GeoEvent[][]): GeoEvent[] {
  const seen = new Set<string>();
  const merged: GeoEvent[] = [];
  for (const event of groups.flat()) {
    const key = normalizeTitle(event.title);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }
  return merged
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, MAX_EVENTS);
}

export async function fetchSnapshot(): Promise<MonitorSnapshot> {
  const sources: { name: string; load: () => Promise<GeoEvent[]> }[] = [
    { name: 'GDELT', load: fetchGdeltEvents },
    ...RSS_FEEDS.map((feed) => ({ name: feed.name, load: () => fetchRssFeed(feed) })),
  ];

  const [results, assets] = await Promise.all([
    Promise.allSettled(sources.map((s) => s.load())),
    fetchMilitaryAssets(),
  ]);

  const feeds: FeedStatus[] = results.map((r, i) =>
    r.status === 'fulfilled'
      ? { name: sources[i].name, ok: true, count: r.value.length }
      : { name: sources[i].name, ok: false, count: 0, error: String(r.reason?.message ?? r.reason) },
  );

  const groups = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  if (groups.length === 0) throw new Error('All news feeds failed. Check your connection.');

  return {
    events: mergeEvents(groups),
    zones: CONFLICT_ZONES,
    assets,
    feeds,
    updatedAt: new Date().toISOString(),
  };
}
