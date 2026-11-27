import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { ALL_EQUIPMENT, EQUIPMENT_LABEL, KIND_LABEL, MUSCLE_LABEL } from '@/data/exercises';
import { deleteExercise, getExercise, saveExercise } from '@/store/actions';
import { BASE } from '@/theme';
import type { Equipment, ExerciseKind, Muscle } from '@/store/types';
import { haptic } from '@/lib/haptics';

const MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[];
const KINDS = Object.keys(KIND_LABEL) as ExerciseKind[];

export default function ExerciseEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? getExercise(id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<ExerciseKind>(existing?.kind ?? 'weight_reps');
  const [primary, setPrimary] = useState<Muscle>(existing?.primary ?? 'chest');
  const [secondary, setSecondary] = useState<Muscle[]>(existing?.secondary ?? []);
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'barbell');

  const save = () => {
    haptic.save();
    saveExercise({ id: existing?.custom ? existing.id : undefined, name: name.trim(), kind, primary, secondary: secondary.filter((m) => m !== primary), equipment });
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BASE.background }} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <TextInput mode="outlined" label="Exercise name" value={name} onChangeText={setName} autoFocus={!existing} />
      <Group title="What do you log?">
        {KINDS.map((k) => (
          <Chip key={k} selected={kind === k} showSelectedOverlay onPress={() => setKind(k)}>
            {KIND_LABEL[k]}
          </Chip>
        ))}
      </Group>
      <Group title="Primary muscle">
        {MUSCLES.map((m) => (
          <Chip key={m} selected={primary === m} showSelectedOverlay onPress={() => setPrimary(m)}>
            {MUSCLE_LABEL[m]}
          </Chip>
        ))}
      </Group>
      <Group title="Other muscles (optional)">
        {MUSCLES.filter((m) => m !== primary).map((m) => (
          <Chip key={m} mode="outlined" selected={secondary.includes(m)} showSelectedOverlay onPress={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}>
            {MUSCLE_LABEL[m]}
          </Chip>
        ))}
      </Group>
      <Group title="Equipment">
        {ALL_EQUIPMENT.map((e) => (
          <Chip key={e} selected={equipment === e} showSelectedOverlay onPress={() => setEquipment(e)}>
            {EQUIPMENT_LABEL[e]}
          </Chip>
        ))}
      </Group>
      <Button mode="contained" onPress={save} disabled={!name.trim()} contentStyle={{ height: 48 }}>
        Save exercise
      </Button>
      {existing?.custom && (
        <Button
          textColor={BASE.danger}
          onPress={() => {
            haptic.remove();
            deleteExercise(existing.id);
            router.back();
          }}
        >
          Delete exercise
        </Button>
      )}
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="labelLarge" style={{ color: BASE.textMuted }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>
    </View>
  );
}
