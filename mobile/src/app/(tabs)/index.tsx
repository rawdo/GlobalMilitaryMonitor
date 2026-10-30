import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WorldMap } from '../../components/WorldMap';
import { useMonitor } from '../../state/MonitorProvider';
import { colors, severityColor, timeAgo } from '../../theme';

export default function MapScreen() {
  const { events, hotspots, assets, updatedAt, refreshing, refresh } = useMonitor();
  const alerts = events.filter((e) => e.isAlert).length;
  const onSelectEvent = useCallback((id: string) => router.push({ pathname: '/event/[id]', params: { id } }), []);

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <Stat label="EVENTS" value={events.length} />
        <Stat label="ALERTS" value={alerts} color={alerts ? colors.alert : undefined} />
        <Stat label="HOTSPOTS" value={hotspots.length} />
        <Stat label="AIRCRAFT" value={assets.length} />
        <Pressable style={styles.updated} onPress={refresh} hitSlop={8}>
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.updatedText}>↻ {timeAgo(updatedAt)}</Text>
          )}
        </Pressable>
      </View>
      <WorldMap events={events} hotspots={hotspots} assets={assets} onSelectEvent={onSelectEvent} />
      <View style={styles.legend} pointerEvents="none">
        {(['Critical', 'High', 'Medium', 'Low'] as const).map((s) => (
          <View key={s} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: severityColor[s] }]} />
            <Text style={styles.legendText}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stat: { marginRight: 18 },
  statValue: { color: colors.accent, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  updated: { marginLeft: 'auto' },
  updatedText: { color: colors.textSecondary, fontSize: 12 },
  legend: {
    position: 'absolute',
    left: 10,
    bottom: 28,
    backgroundColor: '#1E2A3ACC',
    borderRadius: 8,
    padding: 8,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: colors.text, fontSize: 11 },
});
