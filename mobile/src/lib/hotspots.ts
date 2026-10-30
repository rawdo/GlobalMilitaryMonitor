// Derives activity hotspots from live events: places where recent reports cluster, rated by how many
// reports there are and how severe they are. Mirrors the desktop HotspotAnalyzer.cs.

import { SEVERITY_RANK, type GeoEvent, type Hotspot, type SeverityLevel } from './types';

export const HOTSPOT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MIN_REPORTS = 3;

// Institutional locations (e.g. "Pentagon", "NATO") mark where news is made, not where fighting is.
const EXCLUDED = new Set(['NATO/Brussels', 'United States', 'Unknown']);

export function rateIntensity(reports: number, highSeverity: number): SeverityLevel {
  if (highSeverity >= 5 || reports >= 30) return 'Critical';
  if (highSeverity >= 2 || reports >= 15) return 'High';
  if (reports >= 6) return 'Medium';
  return 'Low';
}

export function analyzeHotspots(events: GeoEvent[], now: number): Hotspot[] {
  const since = now - HOTSPOT_WINDOW_MS;
  const groups = new Map<string, GeoEvent[]>();
  for (const e of events) {
    if (e.latitude == null || e.longitude == null || EXCLUDED.has(e.country)) continue;
    if (Date.parse(e.timestamp) < since) continue;
    groups.set(e.country, [...(groups.get(e.country) ?? []), e]);
  }

  const hotspots: Hotspot[] = [];
  for (const [country, group] of groups) {
    if (group.length < MIN_REPORTS) continue;
    const high = group.filter((e) => SEVERITY_RANK[e.severity] >= SEVERITY_RANK.High).length;
    const bySource = new Map<string, number>();
    for (const e of group) bySource.set(e.source, (bySource.get(e.source) ?? 0) + 1);
    hotspots.push({
      id: `hotspot-${country}`,
      name: country,
      description: `${group.length} reports in the last 24h${high ? `, ${high} high-severity` : ''}`,
      centerLatitude: group.reduce((sum, e) => sum + e.latitude!, 0) / group.length,
      centerLongitude: group.reduce((sum, e) => sum + e.longitude!, 0) / group.length,
      radiusKm: Math.min(600, 100 + 15 * group.length),
      intensity: rateIntensity(group.length, high),
      reportCount: group.length,
      highSeverityCount: high,
      sources: [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s),
      lastUpdated: group.map((e) => e.timestamp).sort().at(-1)!,
    });
  }
  return hotspots.sort(
    (a, b) => SEVERITY_RANK[b.intensity] - SEVERITY_RANK[a.intensity] || b.reportCount - a.reportCount,
  );
}
