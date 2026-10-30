import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { GeoEvent } from '../lib/types';
import { useMonitor } from '../state/MonitorProvider';
import { colors } from '../theme';
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
          {error ? <Text style={styles.error}>⚠ {error}</Text> : null}
        </>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.accent} style={styles.empty} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )
      }
      refreshControl={<RefreshControl refreshing={refreshing && !loading} onRefresh={refresh} tintColor={colors.accent} />}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  error: { color: colors.alert, marginHorizontal: 16, marginVertical: 8, fontSize: 13 },
  empty: { marginTop: 48, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
