import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMonitor } from '../../state/MonitorProvider';
import { categoryIcon, categoryLabel, colors, severityColor, timeAgo } from '../../theme';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events } = useMonitor();
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>This event is no longer in the feed.</Text>
      </View>
    );
  }

  const color = severityColor[event.severity];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.tags}>
        <Text style={[styles.tag, { backgroundColor: color }]}>{event.severity.toUpperCase()}</Text>
        <Text style={[styles.tag, styles.categoryTag]}>
          {categoryIcon[event.category]} {categoryLabel[event.category]}
        </Text>
        {event.isAlert ? <Text style={[styles.tag, { backgroundColor: colors.alert }]}>ALERT</Text> : null}
      </View>
      <Text style={styles.title}>{event.title}</Text>
      {event.description ? <Text style={styles.body}>{event.description}</Text> : null}

      <View style={styles.details}>
        <Detail label="Location" value={event.country} />
        <Detail label="Source" value={event.source} />
        <Detail label="Reported" value={`${new Date(event.timestamp).toUTCString()} (${timeAgo(event.timestamp)})`} />
        {event.latitude != null ? (
          <Detail label="Coordinates" value={`${event.latitude.toFixed(2)}, ${event.longitude?.toFixed(2)} (approx.)`} />
        ) : null}
      </View>

      {event.sourceUrl ? (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
          onPress={() => WebBrowser.openBrowserAsync(event.sourceUrl)}
        >
          <Text style={styles.buttonText}>Read full article</Text>
        </Pressable>
      ) : null}
      <Text style={styles.note}>
        Category, severity and location are inferred automatically from keywords and may be inaccurate.
      </Text>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, backgroundColor: colors.background, flexGrow: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryTag: { backgroundColor: colors.surface, color: colors.accent },
  title: { color: colors.text, fontSize: 21, fontWeight: '700', lineHeight: 28 },
  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 10 },
  details: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginTop: 18 },
  detail: { paddingVertical: 6 },
  detailLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  detailValue: { color: colors.text, fontSize: 14, marginTop: 2 },
  button: { backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 18 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  note: { color: colors.textSecondary, fontSize: 12, marginTop: 16, opacity: 0.7 },
});
