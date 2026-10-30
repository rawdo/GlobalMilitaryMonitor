import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GeoEvent } from '../lib/types';
import { categoryCode, colors, fonts, severityColor, timeAgo, zuluTime } from '../theme';
import { Tag } from './hud';

export function EventCard({ event }: { event: GeoEvent }) {
  const color = severityColor[event.severity];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
      style={({ pressed }) => [styles.card, { borderLeftColor: color }, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Tag label={categoryCode[event.category]} color={colors.accent} />
        <Text style={styles.time}>
          {zuluTime(event.timestamp)} · {timeAgo(event.timestamp).toUpperCase()}
        </Text>
        <View style={styles.spacer} />
        {event.isAlert ? <Tag label="ALERT" color={colors.alert} filled /> : null}
        <Tag label={event.severity.toUpperCase()} color={color} />
      </View>
      <Text style={styles.title} numberOfLines={3}>
        {event.title}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.loc} numberOfLines={1}>
          {event.country !== 'Unknown' ? `◉ ${event.country.toUpperCase()}` : '◌ NO FIX'}
        </Text>
        <Text style={styles.source} numberOfLines={1}>
          SRC: {event.source}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  pressed: { backgroundColor: colors.panelRaised },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  time: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 10 },
  spacer: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  loc: { color: colors.accent, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.5 },
  source: { flexShrink: 1, color: colors.textFaint, fontFamily: fonts.mono, fontSize: 10 },
});
