import { useState } from 'react';
import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';
import { enterFade, enterUp, exitFade, layout } from '@/components/motion';
import { Button, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { Card, Empty, NumField, Page, Row } from '@/components/ui';
import { ExerciseHeader } from '@/components/ExerciseHeader';
import { SetBadge, SetFields, nextSetType, setColumns } from '@/components/SetFields';
import { getState, useStore } from '@/store/store';
import { getExercise, newRoutineExercise, newRoutineSet, saveRoutine, startWorkout, toggleSuperset } from '@/store/actions';
import { setPickHandler } from '@/lib/picker';
import { warmupSets } from '@/lib/calc';
import { clone, uid } from '@/lib/format';
import { BASE } from '@/theme';
import type { Routine, RoutineExercise } from '@/store/types';
import { haptic } from '@/lib/haptics';

export default function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useStore((s) => s.settings);
  const { colors } = useTheme();
  const [initial] = useState<Routine>(() => {
    const found = getState().routines.find((x) => x.id === id);
    const now = Date.now();
    return found ? clone(found) : { id: uid(), name: '', note: '', exercises: [], createdAt: now, updatedAt: now };
  });
  const [r, setR] = useState<Routine>(initial);
  const isNew = id === 'new';
  const [ranges, setRanges] = useState<Record<string, boolean>>(() => Object.fromEntries(initial.exercises.map((e) => [e.id, e.sets.some((s) => s.repsMax != null)])));

  const setEx = (exId: string, fn: (e: RoutineExercise) => RoutineExercise) => setR((x) => ({ ...x, exercises: x.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));
  const move = (i: number, d: -1 | 1) =>
    setR((x) => {
      const list = [...x.exercises];
      [list[i], list[i + d]] = [list[i + d], list[i]];
      return { ...x, exercises: list };
    });

  const addExercises = () => {
    setPickHandler((ids) => setR((x) => ({ ...x, exercises: [...x.exercises, ...ids.map(newRoutineExercise)] })));
    router.push('/pick');
  };

  const save = (andStart = false) => {
    haptic.save();
    saveRoutine({ ...r, name: r.name.trim() || 'Untitled routine' });
    if (andStart) {
      router.back();
      startWorkout(r.id);
      router.push('/active');
    } else router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'New routine' : 'Edit routine',
          headerRight: () => (
            <Button mode="contained-tonal" compact onPress={() => save()}>
              Save
            </Button>
          ),
        }}
      />
      <Page>
        <TextInput mode="outlined" label="Routine name" placeholder="e.g. Push day" value={r.name} onChangeText={(name) => setR((x) => ({ ...x, name }))} autoFocus={isNew} />
        <TextInput mode="outlined" label="Notes (optional)" value={r.note} onChangeText={(note) => setR((x) => ({ ...x, note }))} multiline />

        {r.exercises.length === 0 ? (
          <Card>
            <Empty icon="dumbbell" title="Add your first exercise" body="Plan sets, target weights and rest times. You can change everything mid-workout." />
          </Card>
        ) : (
          r.exercises.map((re, i) => {
            const ex = getExercise(re.exerciseId);
            const cols = setColumns(ex, settings);
            const showRange = ranges[re.id] && (ex.kind === 'weight_reps' || ex.kind === 'bodyweight' || ex.kind === 'weighted_bw' || ex.kind === 'assisted_bw');
            let n = 0;
            return (
              <Animated.View key={re.id} layout={layout} entering={enterUp(i)} exiting={exitFade}>
              <Card style={[re.supersetId && { borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
                <ExerciseHeader
                  ex={ex}
                  restSec={re.restSec}
                  onRest={(restSec) => setEx(re.id, (e) => ({ ...e, restSec }))}
                  inSuperset={!!re.supersetId}
                  canSuperset={i < r.exercises.length - 1}
                  onSuperset={() => setR((x) => ({ ...x, exercises: toggleSuperset(x.exercises, re.id) }))}
                  onMoveUp={i > 0 ? () => move(i, -1) : undefined}
                  onMoveDown={i < r.exercises.length - 1 ? () => move(i, 1) : undefined}
                  onRemove={() => setR((x) => ({ ...x, exercises: x.exercises.filter((e) => e.id !== re.id) }))}
                  onWarmups={
                    ex.kind === 'weight_reps'
                      ? () =>
                          setEx(re.id, (e) => {
                            const working = Math.max(0, ...e.sets.filter((s) => s.type !== 'warmup').map((s) => s.weight ?? 0));
                            if (!working) return e;
                            const w = warmupSets(working, settings).map((s) => newRoutineSet('warmup', s));
                            return { ...e, sets: [...w, ...e.sets.filter((s) => s.type !== 'warmup')] };
                          })
                      : undefined
                  }
                  extra={
                    ex.kind === 'duration' || ex.kind === 'distance_time'
                      ? []
                      : [{ title: showRange ? 'Use single rep target' : 'Use rep range', icon: 'arrow-expand-horizontal', onPress: () => setRanges((m) => ({ ...m, [re.id]: !m[re.id] })) }]
                  }
                />
                <RNTextInput
                  value={re.note}
                  onChangeText={(note) => setEx(re.id, (e) => ({ ...e, note }))}
                  placeholder="Add a note (form cue, seat height…)"
                  placeholderTextColor={BASE.textFaint}
                  style={styles.note}
                  multiline
                />
                <Row style={styles.cols}>
                  <Text style={[styles.col, { width: 34 }]}>SET</Text>
                  {cols.map((c) => (
                    <Text key={c} style={[styles.col, { width: c === 'time' ? 76 : 64 }]}>
                      {c.toUpperCase()}
                    </Text>
                  ))}
                  {showRange && <Text style={[styles.col, { width: 56 }]}>MAX</Text>}
                </Row>
                {re.sets.map((s) => {
                  if (s.type !== 'warmup') n++;
                  return (
                    <Animated.View key={s.id} layout={layout} entering={enterFade} exiting={exitFade}>
                    <Row style={styles.setRow}>
                      <SetBadge
                        type={s.type}
                        index={n}
                        onCycle={() => setEx(re.id, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === s.id ? { ...x, type: nextSetType(x.type) } : x)) }))}
                        onLongPress={() => setEx(re.id, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== s.id) }))}
                      />
                      <SetFields ex={ex} v={s} settings={settings} onChange={(patch) => setEx(re.id, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) }))} />
                      {showRange && (
                        <NumField
                          width={56}
                          integer
                          value={s.repsMax}
                          onChange={(repsMax) => setEx(re.id, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === s.id ? { ...x, repsMax } : x)) }))}
                          placeholder="–"
                          accessibilityLabel="Maximum reps"
                        />
                      )}
                      <View style={{ flex: 1 }} />
                      <IconButton icon="close" size={16} onPress={() => (haptic.remove(), setEx(re.id, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== s.id) })))} style={{ margin: 0 }} accessibilityLabel="Remove set" />
                    </Row>
                    </Animated.View>
                  );
                })}
                <Button
                  icon="plus"
                  mode="text"
                  compact
                  onPress={() => setEx(re.id, (e) => ({ ...e, sets: [...e.sets, newRoutineSet('normal', e.sets[e.sets.length - 1])] }))}
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                >
                  Add set
                </Button>
              </Card>
              </Animated.View>
            );
          })
        )}

        <Button mode="outlined" icon="plus" onPress={addExercises} contentStyle={{ height: 48 }}>
          Add exercises
        </Button>
        {r.exercises.length > 0 && (
          <Button mode="contained" icon="play" onPress={() => save(true)} contentStyle={{ height: 48 }}>
            Save & start workout
          </Button>
        )}
        <Text variant="bodySmall" style={{ color: BASE.textFaint, textAlign: 'center' }}>
          Tip: tap a set number to mark it as warm-up (W), failure (F) or drop set (D). Long-press to delete.
        </Text>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  note: { color: BASE.textMuted, fontSize: 13, paddingVertical: 6, paddingHorizontal: 0 },
  cols: { marginTop: 6, marginBottom: 2 },
  col: { color: BASE.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textAlign: 'center' },
  setRow: { paddingVertical: 4 },
});
