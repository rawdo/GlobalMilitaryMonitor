import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EventList } from '../../components/EventList';
import type { EventCategory } from '../../lib/types';
import { useMonitor } from '../../state/MonitorProvider';
import { categoryCode, categoryLabel, colors, fonts } from '../../theme';

export default function FeedScreen() {
  const { events } = useMonitor();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EventCategory | null>(null);

  // Only offer categories that currently have events, most common first.
  const categories = useMemo(() => {
    const counts = new Map<EventCategory, number>();
    for (const e of events) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(
      (e) =>
        (!category || e.category === category) &&
        (!q ||
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q)),
    );
  }, [events, search, category]);

  const header = (
    <View>
      <View style={styles.searchBox}>
        <Text style={styles.prompt}>{'>'}</Text>
        <TextInput
          style={styles.search}
          placeholder="QUERY: event, country, source…"
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={colors.accent}
          cursorColor={colors.accent}
        />
        <Text style={styles.count}>{filtered.length}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={`ALL ${events.length}`} active={!category} onPress={() => setCategory(null)} />
        {categories.map(([c, n]) => (
          <Chip
            key={c}
            label={`${categoryCode[c]} ${n}`}
            hint={categoryLabel[c]}
            active={category === c}
            onPress={() => setCategory(category === c ? null : c)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return <EventList events={filtered} header={header} emptyText="NO CONTACTS MATCH QUERY." />;
}

function Chip({ label, hint, active, onPress }: { label: string; hint?: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityLabel={hint ? `${hint} ${label}` : label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  prompt: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 14, marginRight: 8 },
  search: { flex: 1, color: colors.text, fontFamily: fonts.mono, fontSize: 13, paddingVertical: 10 },
  count: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 11 },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1 },
  chipTextActive: { color: colors.background },
});
