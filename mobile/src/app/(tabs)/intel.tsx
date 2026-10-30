import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { HudPanel, SectionLabel, Tag } from '../../components/hud';
import type { FeedStatus, Hotspot, MilitaryAsset } from '../../lib/types';
import { useMonitor } from '../../state/MonitorProvider';
import { assetIcon, colors, fonts, formatCoords, severityColor, timeAgo } from '../../theme';

type Row =
  | { kind: 'zone'; zone: Hotspot }
  | { kind: 'asset'; asset: MilitaryAsset }
  | { kind: 'feed'; feed: FeedStatus }
  | { kind: 'summary'; feeds: FeedStatus[]; expanded: boolean; toggle: () => void }
  | { kind: 'more'; label: string; toggle: () => void }
  | { kind: 'empty'; text: string };

const COLLAPSED_AIRCRAFT = 10;

export default function IntelScreen() {
  const { hotspots, assets, feeds, updatedAt, refreshing, refresh } = useMonitor();
  const now = useNow(5000);
  const [expanded, setExpanded] = useState(false);
  const [allAircraft, setAllAircraft] = useState(false);
  // Most recently seen first.
  const aircraft = [...assets].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  const shownAircraft = allAircraft ? aircraft : aircraft.slice(0, COLLAPSED_AIRCRAFT);

  // Collapsed, only sources with problems are listed under the summary.
  const shownFeeds = expanded ? feeds : feeds.filter((f) => f.ok === false);
  const sections: { title: string; right: string; data: Row[] }[] = [
    {
      title: `Source network · ${feeds.length}`,
      right: `SYNC ${timeAgo(updatedAt, now).toUpperCase()}`,
      data: [
        { kind: 'summary', feeds, expanded, toggle: () => setExpanded((e) => !e) },
        ...shownFeeds.map((feed): Row => ({ kind: 'feed', feed })),
      ],
    },
    {
      title: `Hotspots · ${hotspots.length}`,
      right: 'LAST 24H OF REPORTS',
      data: hotspots.length
        ? hotspots.map((zone): Row => ({ kind: 'zone', zone }))
        : [{ kind: 'empty', text: 'NO LOCATION HAS 3+ LOCATED REPORTS IN THE LAST 24H.' }],
    },
    {
      title: `Air tracks · ${assets.length}`,
      right: 'LIVE ADS-B',
      data: [
        ...(assets.length
          ? shownAircraft.map((asset): Row => ({ kind: 'asset', asset }))
          : [{ kind: 'empty', text: 'NO LIVE POSITIONS FROM THE ADS-B NETWORKS.' } as Row]),
        ...(aircraft.length > COLLAPSED_AIRCRAFT
          ? [
              {
                kind: 'more',
                label: allAircraft ? 'COLLAPSE ▲' : `SHOW ALL ${aircraft.length} TRACKS ▼`,
                toggle: () => setAllAircraft((v) => !v),
              } as Row,
            ]
          : []),
      ],
    },
  ];

  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={(row, i) => `${row.kind}-${i}`}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <SectionLabel right={section.right}>{section.title}</SectionLabel>}
      renderItem={({ item }) => <IntelRow row={item} now={now} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.panelRaised}
        />
      }
      ListFooterComponent={
        <Text style={styles.footer}>
          ALL DATA IS LIVE OPEN-SOURCE. HOTSPOTS ARE COMPUTED FROM THE REPORTS ABOVE; EVENT LOCATIONS ARE APPROXIMATE
          (COUNTRY/CITY LEVEL). AIR TRACKS ARE AIRCRAFT THE ADS-B NETWORKS FLAG AS MILITARY. NAVAL UNITS ARE NOT TRACKED:
          NO FREE LIVE SOURCE EXISTS.
        </Text>
      }
    />
  );
}

/** Re-renders periodically so countdowns stay current. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function timeUntil(iso: string | null, now: number): string {
  if (!iso) return '—';
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  if (s <= 0) return 'NOW';
  return s < 60 ? `T-${s}S` : `T-${Math.round(s / 60)}M`;
}

function IntelRow({ row, now }: { row: Row; now: number }) {
  switch (row.kind) {
    case 'zone': {
      const color = severityColor[row.zone.intensity];
      return (
        <HudPanel style={styles.card} accent={color} edgeColor={color}>
          <View style={styles.rowHeader}>
            <Text style={styles.title}>{row.zone.name.toUpperCase()}</Text>
            <Tag label={row.zone.intensity.toUpperCase()} color={color} />
          </View>
          <View style={styles.metrics}>
            <Metric label="REPORTS" value={row.zone.reportCount} />
            <Metric
              label="HIGH SEV"
              value={row.zone.highSeverityCount}
              color={row.zone.highSeverityCount ? severityColor.High : undefined}
            />
            <Metric label="LATEST" value={timeAgo(row.zone.lastUpdated, now).toUpperCase()} />
          </View>
          <Text style={styles.meta} numberOfLines={2}>
            SRC: {row.zone.sources.join(' · ')}
          </Text>
        </HudPanel>
      );
    }
    case 'asset':
      return (
        <View style={styles.track}>
          <Text style={styles.trackIcon}>{assetIcon[row.asset.type]}</Text>
          <View style={styles.trackBody}>
            <Text style={styles.trackName} numberOfLines={1}>
              {row.asset.name}
            </Text>
            <Text style={styles.meta}>
              {row.asset.country.toUpperCase()} · {row.asset.status}
              {row.asset.heading != null ? ` · HDG ${String(Math.round(row.asset.heading)).padStart(3, '0')}` : ''}
            </Text>
            <Text style={styles.coords}>
              {formatCoords(row.asset.latitude, row.asset.longitude)} · {timeAgo(row.asset.lastSeen, now).toUpperCase()}
            </Text>
          </View>
        </View>
      );
    case 'more':
      return (
        <Pressable onPress={row.toggle} style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}>
          <Text style={styles.toggle}>{row.label}</Text>
        </Pressable>
      );
    case 'empty':
      return (
        <View style={styles.emptyRow}>
          <Text style={styles.meta}>{row.text}</Text>
        </View>
      );
    case 'summary': {
      const ok = row.feeds.filter((f) => f.ok).length;
      const failing = row.feeds.filter((f) => f.ok === false).length;
      const pending = row.feeds.length - ok - failing;
      const items = row.feeds.reduce((n, f) => n + f.count, 0);
      return (
        <Pressable onPress={row.toggle}>
          <HudPanel style={styles.card}>
            <View style={styles.rowHeader}>
              <View style={styles.metrics}>
                <Metric label="ONLINE" value={ok} />
                <Metric label="FAULT" value={failing} color={failing ? colors.alert : undefined} />
                {pending ? <Metric label="ACQUIRING" value={pending} color={colors.amber} /> : null}
                <Metric label="ITEMS" value={items} />
              </View>
              <Text style={styles.toggle}>{row.expanded ? 'HIDE ▲' : 'ALL ▼'}</Text>
            </View>
            <Text style={styles.meta}>EACH SOURCE IS POLLED AS SOON AS IT CAN HAVE NEW CONTENT.</Text>
          </HudPanel>
        </Pressable>
      );
    }
    case 'feed': {
      const { feed } = row;
      const dotColor = feed.ok == null ? colors.amber : feed.ok ? colors.accent : colors.alert;
      return (
        <View style={styles.feed}>
          <View style={styles.rowHeader}>
            <Text style={[styles.dot, { color: dotColor }]}>■</Text>
            <Text style={styles.feedName} numberOfLines={1}>
              {feed.name}
            </Text>
            <Text style={styles.feedGroup}>{feed.group.toUpperCase()}</Text>
          </View>
          {feed.error ? (
            <Text style={[styles.meta, { color: colors.alert }]} numberOfLines={2}>
              FAULT: {feed.error}
            </Text>
          ) : null}
          <Text style={styles.meta}>
            {feed.count} ITEMS · CHK {timeAgo(feed.lastChecked, now).toUpperCase()} · NEXT {timeUntil(feed.nextCheck, now)}
          </Text>
          <Text style={styles.meta}>POLL: {feed.schedule}</Text>
        </View>
      );
    }
  }
}

function Metric({ label, value, color = colors.text }: { label: string; value: string | number; color?: string }) {
  return (
    <View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  card: { marginHorizontal: 12, marginVertical: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 18, letterSpacing: 1.5, flexShrink: 1 },
  metrics: { flexDirection: 'row', gap: 18, marginVertical: 6 },
  metricValue: { fontFamily: fonts.monoBold, fontSize: 15 },
  metricLabel: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.5 },
  meta: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 10, marginTop: 3, lineHeight: 14 },
  track: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  trackIcon: { color: colors.air, fontSize: 16, width: 20, textAlign: 'center', marginTop: 1 },
  trackBody: { flex: 1 },
  trackName: { color: colors.air, fontFamily: fonts.display, fontSize: 16 },
  coords: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
  more: { marginHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  toggle: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.5 },
  emptyRow: { marginHorizontal: 14, paddingVertical: 8 },
  feed: {
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  dot: { fontSize: 9 },
  feedName: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 15 },
  feedGroup: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  footer: {
    color: colors.textFaint,
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 0.5,
    padding: 20,
    textAlign: 'center',
  },
});
