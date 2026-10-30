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

export interface ConflictZone {
  id: string;
  name: string;
  description: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  intensity: SeverityLevel;
  involvedParties: string[];
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

export interface MilitaryAsset {
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
