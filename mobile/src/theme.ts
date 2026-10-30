// Colour palette matches the desktop DarkTheme.xaml.

import type { AssetType, EventCategory, SeverityLevel } from './lib/types';

export const colors = {
  background: '#1A1A2E',
  secondaryBackground: '#16213E',
  card: '#1E2A3A',
  surface: '#233044',
  border: '#2A3F5F',
  text: '#E8E8E8',
  textSecondary: '#A0A8B4',
  accent: '#00D4FF',
  alert: '#FF4444',
};

export const severityColor: Record<SeverityLevel, string> = {
  Low: '#4CAF50',
  Medium: '#FF9800',
  High: '#F44336',
  Critical: '#D50000',
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
  Other: 'Other',
};

export const categoryIcon: Record<EventCategory, string> = {
  Conflict: '⚔️',
  MissileLaunch: '🚀',
  MilitaryMovement: '🪖',
  NavalActivity: '⚓',
  AirActivity: '✈️',
  Diplomacy: '🤝',
  Sanctions: '🚫',
  Terrorism: '⚠️',
  CyberAttack: '💻',
  NuclearActivity: '☢️',
  Other: 'ℹ️',
};

export const assetIcon: Record<AssetType, string> = {
  Aircraft: '✈️',
  Warship: '🚢',
  Submarine: '🌊',
  GroundForce: '🛡️',
  MissileLauncher: '🚀',
  Drone: '🛩️',
  Satellite: '🛰️',
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
