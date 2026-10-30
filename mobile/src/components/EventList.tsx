import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { GeoEvent } from '../lib/types';
import { useMonitor } from '../state/MonitorProvider';
import { colors, fonts } from '../theme';
import { EventCard } from './EventCard';

interface Props {
  events: GeoEvent[];
  emptyText: string;
  header?: ReactElement;
}

export function EventList({ events, emptyText, header }: Props) {
  const { loading, refreshing, refresh, error } = useMonitor();
  return (
    <FlatList
      style={styles.list}
      data={events}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <EventCard event={item} />}
      ListHeaderComponent={
        <>
          {header}
          {error ? <Text style={styles.error}>⚠ LINK FAILURE: {error}</Text> : null}
        </>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.emptyText}>ACQUIRING SOURCES…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing && !loading}
          onRefresh={refresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.panelRaised}
        />
      }
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24, paddingTop: 4 },
  error: { color: colors.alert, fontFamily: fonts.mono, fontSize: 11, marginHorizontal: 14, marginVertical: 8 },
  empty: { marginTop: 56, alignItems: 'center', gap: 10 },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 17,
  },
});
