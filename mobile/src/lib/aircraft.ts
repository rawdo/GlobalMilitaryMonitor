// Live military aircraft from keyless ADS-B aggregators (readsb "v2" JSON, used by adsb.lol and
// adsb.fi). Mirrors the desktop MilitaryAircraftFeedService.cs.

import { countryOfIcao } from './icao';
import type { MilitaryAsset } from './types';

/** Positions older than this are dropped as no longer live. */
export const MAX_POSITION_AGE_MS = 2 * 60 * 1000;

const DRONE_TYPES = new Set(['Q1', 'Q4', 'Q9', 'MQ1', 'MQ4', 'MQ9', 'RQ4', 'RQ7', 'HRON', 'TB2', 'AKIN', 'WLII']);

interface ReadsbAircraft {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  desc?: string;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  lat?: number;
  lon?: number;
  seen_pos?: number;
}

export function parseAircraft(body: string, sourceName: string): MilitaryAsset[] {
  const json: { now?: number; ac?: ReadsbAircraft[] } = JSON.parse(body);
  if (typeof json.now !== 'number') throw new Error("Response has no 'now' timestamp");

  const assets: MilitaryAsset[] = [];
  for (const ac of json.ac ?? []) {
    if (ac.lat == null || ac.lon == null || !ac.hex) continue;
    const seenAgoMs = (ac.seen_pos ?? 0) * 1000;
    if (seenAgoMs > MAX_POSITION_AGE_MS) continue;

    const callsign = ac.flight?.trim();
    const label = callsign || ac.r || ac.hex.toUpperCase();
    const model = ac.desc ?? (ac.t || null);
    const altitude =
      typeof ac.alt_baro === 'string'
        ? 'on ground'
        : typeof ac.alt_baro === 'number'
          ? `${ac.alt_baro.toLocaleString('en-US')} ft`
          : 'altitude n/a';

    assets.push({
      id: ac.hex,
      name: model ? `${label} (${model})` : label,
      type: DRONE_TYPES.has((ac.t ?? '').toUpperCase()) ? 'Drone' : 'Aircraft',
      country: countryOfIcao(ac.hex),
      latitude: ac.lat,
      longitude: ac.lon,
      heading: ac.track ?? null,
      speedKnots: ac.gs ?? null,
      status: ac.gs == null ? altitude : `${altitude} · ${Math.round(ac.gs)} kn`,
      source: sourceName,
      lastSeen: new Date(json.now - seenAgoMs).toISOString(),
    });
  }
  return assets;
}

/** Merges aircraft reported by several networks, keeping the freshest position of each. */
export function mergeAircraft(groups: MilitaryAsset[][]): MilitaryAsset[] {
  const byId = new Map<string, MilitaryAsset>();
  for (const a of groups.flat()) {
    const existing = byId.get(a.id);
    if (!existing || a.lastSeen > existing.lastSeen) byId.set(a.id, a);
  }
  return [...byId.values()];
}
