// Merges the events from every source into one deduplicated, newest-first list
// (the desktop DataAggregator). Fetching and scheduling live in MonitorProvider.

import { normalizeTitle } from './classify';
import type { GeoEvent } from './types';

const MAX_EVENTS = 400;

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
