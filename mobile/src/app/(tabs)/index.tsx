import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Readout } from '../../components/hud';
import { WorldMap } from '../../components/WorldMap';
import { useMonitor } from '../../state/MonitorProvider';
import { colors, fonts, severityColor, timeAgo } from '../../theme';

export default function MapScreen() {
  const { events, hotspots, assets, updatedAt, refreshing, refresh } = useMonitor();
  const alerts = events.filter((e) => e.isAlert).length;
  const onSelectEvent = useCallback((id: string) => router.push({ pathname: '/event/[id]', params: { id } }), []);

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <Readout label="EVENTS" value={events.length} />
        <Readout label="ALERTS" value={alerts} color={alerts ? colors.alert : colors.accent} />
        <Readout label="HOTSPOTS" value={hotspots.length} color={colors.amber} />
        <Readout label="AIR TRK" value={assets.length} color={colors.air} />
        <Pressable style={styles.sync} onPress={refresh} hitSlop={10} accessibilityLabel="Refresh all sources">
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <>
              <Text style={styles.syncIcon}>⟳</Text>
              <Text style={styles.syncText}>{timeAgo(updatedAt).toUpperCase()}</Text>
            </>
          )}
        </Pressable>
      </View>
      <WorldMap events={events} hotspots={hotspots} assets={assets} onSelectEvent={onSelectEvent} />
      <View style={styles.legend} pointerEvents="none">
        {(['Critical', 'High', 'Medium', 'Low'] as const).map((s) => (
          <View key={s} style={styles.legendRow}>
            <View style={[styles.diamond, { backgroundColor: severityColor[s] }]} />
            <Text style={styles.legendText}>{s.toUpperCase()}</Text>
          </View>
        ))}
        <View style={styles.legendRow}>
          <Text style={[styles.legendGlyph, { color: colors.air }]}>▲</Text>
          <Text style={styles.legendText}>AIR TRACK</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.ring} />
          <Text style={styles.legendText}>HOTSPOT</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sync: { alignItems: 'center', minWidth: 52 },
  syncIcon: { color: colors.accent, fontSize: 18, lineHeight: 20 },
  syncText: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1 },
  legend: {
    position: 'absolute',
    left: 10,
    bottom: 28,
    backgroundColor: 'rgba(4,8,10,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineBright,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2, gap: 7 },
  diamond: { width: 8, height: 8, transform: [{ rotate: '45deg' }], marginHorizontal: 1 },
  legendGlyph: { fontSize: 9, width: 10, textAlign: 'center' },
  ring: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.amber },
  legendText: { color: colors.text, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
});
