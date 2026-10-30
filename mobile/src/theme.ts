// Tactical HUD design system: near-black panels with a green cast, phosphor-green accent, cyan for
// air tracks, amber/red for threat. Condensed display type (Rajdhani) for headings, monospace
// (JetBrains Mono) for data readouts.

import type { AssetType, EventCategory, SeverityLevel } from './lib/types';

export const colors = {
  background: '#04080A',
  panel: '#0A1216',
  panelRaised: '#0F1B20',
  line: '#17332C',
  lineBright: '#2A5E4F',
  text: '#D5E8E0',
  textSecondary: '#7F9C92',
  textFaint: '#4A6560',
  accent: '#3DFFA2',
  accentDim: '#1F8A58',
  air: '#38D6FF',
  amber: '#FFB020',
  alert: '#FF3D4F',
};

export const fonts = {
  display: 'Rajdhani_600SemiBold',
  displayBold: 'Rajdhani_700Bold',
  body: 'Rajdhani_500Medium',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
};

export const severityColor: Record<SeverityLevel, string> = {
  Low: '#3DFFA2',
  Medium: '#FFB020',
  High: '#FF6A2B',
  Critical: '#FF1F4B',
};

export const categoryLabel: Record<EventCategory, string> = {
  Conflict: 'Conflict',
  MissileLaunch: 'Missile',
  MilitaryMovement: 'Movement',
  NavalActivity: 'Naval',
  AirActivity: 'Air',
  Diplomacy: 'Diplomacy',
  Sanctions: 'Sanctions',
  Terrorism: 'Terrorism',
  CyberAttack: 'Cyber',
  NuclearActivity: 'Nuclear',
  Other: 'General',
};

/** Three-letter category codes shown as tags, e.g. [MSL]. */
export const categoryCode: Record<EventCategory, string> = {
  Conflict: 'CNF',
  MissileLaunch: 'MSL',
  MilitaryMovement: 'MOV',
  NavalActivity: 'NAV',
  AirActivity: 'AIR',
  Diplomacy: 'DIP',
  Sanctions: 'SNC',
  Terrorism: 'TER',
  CyberAttack: 'CYB',
  NuclearActivity: 'NUC',
  Other: 'GEN',
};

export const assetIcon: Record<AssetType, string> = {
  Aircraft: '✈',
  Warship: '⛴',
  Submarine: '▼',
  GroundForce: '■',
  MissileLauncher: '▲',
  Drone: '◆',
  Satellite: '◎',
  Other: '●',
};

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Zulu (UTC) time of day, e.g. "0932Z". */
export function zuluTime(iso: string | number | Date): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`;
}

/** Military date-time group, e.g. "300932Z OCT 26". */
export function dateTimeGroup(iso: string | number | Date): string {
  const d = new Date(iso);
  return `${pad(d.getUTCDate())}${zuluTime(d)} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCFullYear() % 100)}`;
}

/** Latitude/longitude as "48.38°N 031.17°E". */
export function formatCoords(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(2).padStart(5, '0')}°${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(2).padStart(6, '0')}°${lon >= 0 ? 'E' : 'W'}`;
  return `${la} ${lo}`;
}
