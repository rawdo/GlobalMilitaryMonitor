// Mirrors the domain models of the desktop app (DataIngestion/Models).

export type EventCategory =
  | 'Conflict'
  | 'MissileLaunch'
  | 'MilitaryMovement'
  | 'NavalActivity'
  | 'AirActivity'
  | 'Diplomacy'
  | 'Sanctions'
  | 'Terrorism'
  | 'CyberAttack'
  | 'NuclearActivity'
  | 'Other';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export const SEVERITY_RANK: Record<SeverityLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
};

export interface GeoEvent {
  id: string;
  title: string;
  description: string;
  /** null when no location could be derived; such events appear in lists but not on the map. */
  latitude: number | null;
  longitude: number | null;
  /** ISO 8601 UTC timestamp. */
  timestamp: string;
  category: EventCategory;
  severity: SeverityLevel;
  source: string;
  sourceUrl: string;
  country: string;
  isAlert: boolean;
}

/**
 * An activity hotspot: a place where live reports cluster. Derived from the current events
 * (see lib/hotspots.ts), never hand-entered.
 */
export interface Hotspot {
  id: string;
  name: string;
  description: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  intensity: SeverityLevel;
  reportCount: number;
  highSeverityCount: number;
  /** Outlets reporting from this hotspot, most reports first. */
  sources: string[];
  /** ISO timestamp of the newest report. */
  lastUpdated: string;
}

export type AssetType =
  | 'Aircraft'
  | 'Warship'
  | 'Submarine'
  | 'GroundForce'
  | 'MissileLauncher'
  | 'Drone'
  | 'Satellite'
  | 'Other';

/** A live military aircraft position from ADS-B. */
export interface MilitaryAsset {
  /** ICAO 24-bit address (hex). */
  id: string;
  name: string;
  type: AssetType;
  country: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speedKnots: number | null;
  status: string;
  source: string;
  /** ISO timestamp of the position report. */
  lastSeen: string;
}

export interface FeedStatus {
  id: string;
  name: string;
  group: string;
  url: string;
  homepage: string;
  /** null until the first fetch completes. */
  ok: boolean | null;
  count: number;
  error?: string;
  /** ISO timestamps. */
  lastChecked: string | null;
  lastChanged: string | null;
  nextCheck: string | null;
  /** Human-readable explanation of the polling interval, e.g. "5 min (source cache)". */
  schedule: string;
}
