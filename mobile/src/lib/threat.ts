// Global threat index shown in the HUD header. Derived only from live data: the most intense
// hotspot and the number of current alerts. Not an official alert level.

import { SEVERITY_RANK, type GeoEvent, type Hotspot } from './types';

export interface ThreatIndex {
  level: 0 | 1 | 2 | 3;
  label: 'GUARDED' | 'ELEVATED' | 'HIGH' | 'SEVERE';
  basis: string;
}

const LABELS: ThreatIndex['label'][] = ['GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'];

export function threatIndex(hotspots: Hotspot[], events: GeoEvent[]): ThreatIndex {
  const alerts = events.filter((e) => e.isAlert).length;
  const peak = hotspots.reduce((max, h) => Math.max(max, SEVERITY_RANK[h.intensity]), 0);
  // Ten or more simultaneous high-severity reports raise the index one step.
  const level = Math.min(3, peak + (alerts >= 10 ? 1 : 0)) as ThreatIndex['level'];
  const top = hotspots[0];
  const basis = top
    ? `${top.name.toUpperCase()} ${top.intensity.toUpperCase()} · ${alerts} ALERTS`
    : `${alerts} ALERTS · NO HOTSPOTS`;
  return { level, label: LABELS[level], basis };
}
