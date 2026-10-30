import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HudPanel, Tag } from '../../components/hud';
import { useMonitor } from '../../state/MonitorProvider';
import {
  categoryCode,
  categoryLabel,
  colors,
  dateTimeGroup,
  fonts,
  formatCoords,
  severityColor,
  timeAgo,
} from '../../theme';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events } = useMonitor();
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>REPORT NO LONGER IN THE FEED.</Text>
      </View>
    );
  }

  const color = severityColor[event.severity];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Open-source news is unclassified; the banner states the handling, it doesn't imply secrecy. */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>UNCLASSIFIED // OPEN SOURCE</Text>
      </View>

      <View style={styles.tags}>
        <Tag label={categoryCode[event.category]} />
        <Tag label={event.severity.toUpperCase()} color={color} filled />
        {event.isAlert ? <Tag label="ALERT" color={colors.alert} /> : null}
        <Text style={styles.dtg}>{dateTimeGroup(event.timestamp)}</Text>
      </View>

      <Text style={styles.title}>{event.title}</Text>
      {event.description ? <Text style={styles.body}>{event.description}</Text> : null}

      <HudPanel style={styles.details} accent={color}>
        <Field label="CATEGORY" value={categoryLabel[event.category].toUpperCase()} />
        <Field label="LOCATION" value={event.country === 'Unknown' ? 'NO FIX' : event.country.toUpperCase()} />
        {event.latitude != null && event.longitude != null ? (
          <Field label="GRID (APPROX.)" value={formatCoords(event.latitude, event.longitude)} />
        ) : null}
        <Field label="SOURCE" value={event.source} />
        <Field label="REPORTED" value={`${new Date(event.timestamp).toUTCString()} · ${timeAgo(event.timestamp)}`} />
      </HudPanel>

      {event.sourceUrl ? (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
          onPress={() => WebBrowser.openBrowserAsync(event.sourceUrl, { toolbarColor: colors.background })}
        >
          <Text style={styles.buttonText}>OPEN SOURCE ARTICLE ›</Text>
        </Pressable>
      ) : null}
      <Text style={styles.note}>
        CATEGORY, SEVERITY AND LOCATION ARE INFERRED AUTOMATICALLY FROM KEYWORDS AND MAY BE INACCURATE.
      </Text>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 40, backgroundColor: colors.background, flexGrow: 1 },
  banner: { borderWidth: 1, borderColor: colors.accentDim, paddingVertical: 3, alignItems: 'center', marginBottom: 14 },
  bannerText: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 },
  dtg: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 11, marginLeft: 'auto' },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 25, lineHeight: 29 },
  body: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 16, lineHeight: 22, marginTop: 10 },
  details: { marginTop: 20, gap: 2 },
  field: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  fieldLabel: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5 },
  fieldValue: { color: colors.text, fontFamily: fonts.mono, fontSize: 13, marginTop: 2 },
  button: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(61,255,162,0.08)',
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 13, letterSpacing: 2 },
  note: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 9, lineHeight: 14, marginTop: 16 },
});
