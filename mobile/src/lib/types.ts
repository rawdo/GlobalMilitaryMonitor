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
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface MonitorSnapshot {
  events: GeoEvent[];
  zones: ConflictZone[];
  assets: MilitaryAsset[];
  feeds: FeedStatus[];
  /** ISO timestamp of the last successful refresh. */
  updatedAt: string | null;
}
