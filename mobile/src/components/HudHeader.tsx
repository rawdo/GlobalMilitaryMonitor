// Top bar shown on every tab: app mark, screen title, live UTC clock, link status and threat index.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { threatIndex } from '../lib/threat';
import { useMonitor } from '../state/MonitorProvider';
import { colors, fonts } from '../theme';
import { Blink, ZuluClock } from './hud';

const LEVEL_COLORS = [colors.accent, colors.amber, '#FF6A2B', '#FF1F4B'];

export function HudHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { events, hotspots, feeds } = useMonitor();
  const threat = useMemo(() => threatIndex(hotspots, events), [hotspots, events]);
  const live = feeds.filter((f) => f.ok).length;
  const levelColor = LEVEL_COLORS[threat.level];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Text style={styles.mark}>◢ GMM</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>
          <ZuluClock />
          <View style={styles.link}>
            <Blink color={live > 0 ? colors.accent : colors.alert} size={6} />
            <Text style={styles.linkText}>
              {live}/{feeds.length} LINK
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.threat}>
        <Text style={styles.threatLabel}>THREAT INDEX</Text>
        <View style={styles.bars}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.bar, { backgroundColor: i <= threat.level ? levelColor : colors.line }]}
            />
          ))}
        </View>
        <Text style={[styles.threatLevel, { color: levelColor }]}>{threat.label}</Text>
        <Text style={styles.threatBasis} numberOfLines={1}>
          {threat.basis}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 1 },
  title: { flex: 1, color: colors.text, fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: 2.5 },
  right: { alignItems: 'flex-end' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  linkText: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  threat: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  threatLabel: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5 },
  bars: { flexDirection: 'row', gap: 2 },
  bar: { width: 14, height: 5, transform: [{ skewX: '-20deg' }] },
  threatLevel: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.5 },
  threatBasis: { flex: 1, color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 9, textAlign: 'right' },
});
