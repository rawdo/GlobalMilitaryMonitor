import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EventList } from '../../components/EventList';
import { SEVERITY_RANK } from '../../lib/types';
import { useMonitor } from '../../state/MonitorProvider';
import { colors, fonts, severityColor } from '../../theme';

export default function AlertsScreen() {
  const { events } = useMonitor();
  // Critical first, then newest.
  const alerts = useMemo(
    () =>
      events
        .filter((e) => e.isAlert)
        .sort(
          (a, b) =>
            SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.timestamp.localeCompare(a.timestamp),
        ),
    [events],
  );
  const critical = alerts.filter((a) => a.severity === 'Critical').length;

  const header = (
    <View style={styles.banner}>
      <Text style={[styles.count, { color: alerts.length ? colors.alert : colors.accent }]}>
        {String(alerts.length).padStart(2, '0')}
      </Text>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>{alerts.length ? 'ACTIVE ALERTS' : 'NO ACTIVE ALERTS'}</Text>
        <Text style={styles.bannerSub}>
          <Text style={{ color: severityColor.Critical }}>{critical} CRITICAL</Text> ·{' '}
          <Text style={{ color: severityColor.High }}>{alerts.length - critical} HIGH</Text> · SORTED BY SEVERITY
        </Text>
      </View>
    </View>
  );

  return (
    <EventList
      events={alerts}
      header={header}
      emptyText="ALERTS TRIGGER ON NUCLEAR WEAPONS ACTIVITY, MISSILE LAUNCHES, INVASIONS AND REPORTED CASUALTIES."
    />
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
    backgroundColor: 'rgba(255,61,79,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,79,0.35)',
  },
  count: { fontFamily: fonts.monoBold, fontSize: 34 },
  bannerText: { flex: 1 },
  bannerTitle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 18, letterSpacing: 2 },
  bannerSub: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
});
