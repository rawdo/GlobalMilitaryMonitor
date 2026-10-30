import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EventList } from '../../components/EventList';
import type { EventCategory } from '../../lib/types';
import { useMonitor } from '../../state/MonitorProvider';
import { categoryIcon, categoryLabel, colors } from '../../theme';

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
      <TextInput
        style={styles.search}
        placeholder="Search events, countries…"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
        autoCorrect={false}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={`All (${events.length})`} active={!category} onPress={() => setCategory(null)} />
        {categories.map(([c, n]) => (
          <Chip
            key={c}
            label={`${categoryIcon[c]} ${categoryLabel[c]} (${n})`}
            active={category === c}
            onPress={() => setCategory(category === c ? null : c)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return <EventList events={filtered} header={header} emptyText="No events match your filters." />;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    margin: 12,
    marginBottom: 4,
    fontSize: 15,
  },
  chips: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: colors.background, fontWeight: '700' },
});
