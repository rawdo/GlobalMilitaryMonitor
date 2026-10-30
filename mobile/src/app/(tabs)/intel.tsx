import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import type { ConflictZone, FeedStatus, MilitaryAsset } from '../../lib/types';
import { useMonitor } from '../../state/MonitorProvider';
import { assetIcon, colors, severityColor, timeAgo } from '../../theme';

type Row =
  | { kind: 'zone'; zone: ConflictZone }
  | { kind: 'asset'; asset: MilitaryAsset }
  | { kind: 'feed'; feed: FeedStatus };

export default function IntelScreen() {
  const { zones, assets, feeds, updatedAt, refreshing, refresh } = useMonitor();

  const sections: { title: string; data: Row[] }[] = [
    { title: `ACTIVE CONFLICT ZONES (${zones.length})`, data: zones.map((zone) => ({ kind: 'zone', zone })) },
    { title: `TRACKED ASSETS (${assets.length})`, data: assets.map((asset) => ({ kind: 'asset', asset })) },
    {
      title: `DATA SOURCES · updated ${timeAgo(updatedAt)}`,
      data: feeds.map((feed) => ({ kind: 'feed', feed })),
    },
  ];

  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={(row, i) => `${row.kind}-${i}`}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
      renderItem={({ item }) => <IntelRow row={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      ListFooterComponent={
        <Text style={styles.footer}>
          Zones and asset positions are approximate OSINT reference data, not live tracking.
        </Text>
      }
    />
  );
}

function IntelRow({ row }: { row: Row }) {
  switch (row.kind) {
    case 'zone':
      return (
        <View style={[styles.card, { borderLeftColor: severityColor[row.zone.intensity] }]}>
          <View style={styles.rowHeader}>
            <Text style={styles.title}>{row.zone.name}</Text>
            <Text style={[styles.tag, { color: severityColor[row.zone.intensity] }]}>
              {row.zone.intensity.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.body}>{row.zone.description}</Text>
          <Text style={styles.meta}>{row.zone.involvedParties.join(' · ')}</Text>
        </View>
      );
    case 'asset':
      return (
        <View style={styles.card}>
          <Text style={styles.title}>
            {assetIcon[row.asset.type]} {row.asset.name}
          </Text>
          <Text style={styles.body}>
            {row.asset.country} · {row.asset.status}
          </Text>
          {row.asset.speedKnots ? (
            <Text style={styles.meta}>
              {row.asset.speedKnots} kn · heading {row.asset.heading}° · {row.asset.source}
            </Text>
          ) : null}
        </View>
      );
    case 'feed':
      return (
        <View style={[styles.card, styles.feed]}>
          <Text style={[styles.dot, { color: row.feed.ok ? severityColor.Low : colors.alert }]}>●</Text>
          <Text style={[styles.title, styles.feedName]}>{row.feed.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {row.feed.ok ? `${row.feed.count} events` : row.feed.error}
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  section: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  tag: { fontSize: 10, fontWeight: '800', marginLeft: 8 },
  body: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 4, opacity: 0.8 },
  feed: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedName: { flex: 1 },
  dot: { fontSize: 12 },
  footer: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', padding: 24, opacity: 0.7 },
});
