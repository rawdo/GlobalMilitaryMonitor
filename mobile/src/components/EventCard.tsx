import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GeoEvent } from '../lib/types';
import { categoryIcon, categoryLabel, colors, severityColor, timeAgo } from '../theme';

export function EventCard({ event }: { event: GeoEvent }) {
  const color = severityColor[event.severity];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
      style={({ pressed }) => [styles.card, { borderLeftColor: color }, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.category}>
          {categoryIcon[event.category]} {categoryLabel[event.category].toUpperCase()}
        </Text>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{event.severity.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={3}>
        {event.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {event.country !== 'Unknown' ? `${event.country} · ` : ''}
        {event.source} · {timeAgo(event.timestamp)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 5,
  },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  category: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
});
