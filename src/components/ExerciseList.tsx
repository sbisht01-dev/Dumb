import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Icon, Searchbar, Text, useTheme } from 'react-native-paper';
import { ALL_EQUIPMENT, EQUIPMENT_LABEL, MUSCLE_LABEL } from '@/data/exercises';
import { useStore } from '@/store/store';
import { allExercises } from '@/store/actions';
import { BASE } from '@/theme';
import type { Equipment, Exercise, Muscle } from '@/store/types';

const MUSCLE_FILTERS: Muscle[] = ['chest', 'lats', 'upper_back', 'lower_back', 'shoulders', 'biceps', 'triceps', 'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'cardio', 'full_body'];

export function ExerciseList({ selected, onPress, header }: { selected?: string[]; onPress: (ex: Exercise) => void; header?: React.ReactNode }) {
  const custom = useStore((s) => s.customExercises);
  const workouts = useStore((s) => s.workouts);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equip, setEquip] = useState<Equipment | null>(null);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    workouts.slice(0, 60).forEach((w) => w.exercises.forEach((e) => m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1)));
    return m;
  }, [workouts]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allExercises()
      .filter((e) => (!muscle || e.primary === muscle || e.secondary.includes(muscle)) && (!equip || e.equipment === equip) && (!term || e.name.toLowerCase().includes(term)))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, muscle, equip, custom, usage]);

  return (
    <FlatList
      data={list}
      keyExtractor={(e) => e.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 120 }}
      ListHeaderComponent={
        <View style={{ gap: 10, paddingBottom: 8 }}>
          {header}
          <Searchbar placeholder="Search exercises" value={q} onChangeText={setQ} style={styles.search} inputStyle={{ minHeight: 0 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {MUSCLE_FILTERS.map((m) => (
              <Chip key={m} selected={muscle === m} showSelectedOverlay onPress={() => setMuscle(muscle === m ? null : m)} compact>
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {ALL_EQUIPMENT.map((e) => (
              <Chip key={e} selected={equip === e} showSelectedOverlay onPress={() => setEquip(equip === e ? null : e)} compact mode="outlined">
                {EQUIPMENT_LABEL[e]}
              </Chip>
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <Text variant="bodyMedium" style={{ color: BASE.textMuted, textAlign: 'center', padding: 24 }}>
          No exercises match. Try another filter or create a custom one.
        </Text>
      }
      renderItem={({ item }) => <ExerciseRow ex={item} on={selected?.includes(item.id) ?? false} order={selected ? selected.indexOf(item.id) + 1 : 0} onPress={() => onPress(item)} />}
    />
  );
}

function ExerciseRow({ ex, on, order, onPress }: { ex: Exercise; on: boolean; order: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} android_ripple={{ color: 'rgba(255,255,255,0.06)' }} style={[styles.row, on && { backgroundColor: colors.primaryContainer }]} accessibilityState={{ selected: on }}>
      <View style={[styles.avatar, on && { backgroundColor: colors.primary }]}>
        {on ? <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{order}</Text> : <Text style={styles.avatarText}>{ex.name[0]}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge" numberOfLines={1} style={{ fontWeight: '600' }}>
          {ex.name}
        </Text>
        <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
          {MUSCLE_LABEL[ex.primary]} · {EQUIPMENT_LABEL[ex.equipment]}
          {ex.custom ? ' · Custom' : ''}
        </Text>
      </View>
      {on ? <Icon source="check-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { backgroundColor: BASE.containerHigh, borderRadius: 16, height: 48 },
  chips: { gap: 6, paddingRight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: BASE.containerHigh, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: BASE.textMuted, fontWeight: '700', fontSize: 16 },
});
