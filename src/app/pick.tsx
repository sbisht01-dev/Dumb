import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, FAB } from 'react-native-paper';
import { ExerciseList } from '@/components/ExerciseList';
import { resolvePick } from '@/lib/picker';
import { BASE } from '@/theme';
import { haptic } from '@/lib/haptics';

export default function Pick() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <View style={{ flex: 1, backgroundColor: BASE.background, paddingHorizontal: 12 }}>
      <ExerciseList
        selected={selected}
        onPress={(ex) => setSelected((s) => (s.includes(ex.id) ? s.filter((x) => x !== ex.id) : [...s, ex.id]))}
        header={
          <Button mode="text" icon="plus" onPress={() => router.push('/exercise-edit')} style={{ alignSelf: 'flex-start' }}>
            Create custom exercise
          </Button>
        }
      />
      {selected.length > 0 && (
        <FAB
          icon="check"
          label={`Add ${selected.length} exercise${selected.length > 1 ? 's' : ''}`}
          style={styles.fab}
          onPress={() => {
            haptic.choose();
            resolvePick(selected);
            router.back();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 16, bottom: 24 },
});
