import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { enterBar, enterFade, enterUp, exitBar, exitFade, layout } from '@/components/motion';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Button, Dialog, Icon, IconButton, Menu, Portal, ProgressBar, Snackbar, Text, useTheme } from 'react-native-paper';
import { Card, Empty, Row, Stat, StatRow } from '@/components/ui';
import { ExerciseHeader } from '@/components/ExerciseHeader';
import { InlineTimer, SetBadge, SetFields, describeSet, nextSetType, setColumns } from '@/components/SetFields';
import { getState, useStore } from '@/store/store';
import {
  addExercisesToActive,
  addSet,
  adjustRest,
  discardWorkout,
  finishWorkout,
  getExercise,
  moveExercise,
  removeExercise,
  removeSet,
  skipRest,
  startRest,
  toggleSuperset,
  updateActive,
  updateExercise,
  updateSet,
} from '@/store/actions';
import { PR_LABEL, addSetToRecords, computeRecords, previousSets, setPRs, workoutTotals } from '@/store/stats';
import { setPickHandler } from '@/lib/picker';
import { warmupSets } from '@/lib/calc';
import { fmtClock, fmtVolume, uid } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { BASE } from '@/theme';
import type { WorkoutExercise, WorkoutSet } from '@/store/types';

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export default function ActiveWorkout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const workouts = useStore((s) => s.workouts);
  const [now, setNow] = useState(() => Date.now());
  const [pr, setPr] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | 'finish-empty' | 'discard'>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      const a = getState().active;
      if (a?.restEndsAt && a.restEndsAt <= Date.now()) {
        haptic.rest();
        skipRest();
      }
    }, 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!settings.keepAwake) return;
    activateKeepAwakeAsync('workout').catch(() => {});
    return () => {
      deactivateKeepAwake('workout').catch(() => {});
    };
  }, [settings.keepAwake]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => sub.remove();
  }, []);

  const totals = useMemo(() => (active ? workoutTotals(active, settings) : null), [active, settings]);

  if (!active || !totals) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Empty icon="check-circle-outline" title="No workout running" action={<Button onPress={() => router.back()}>Close</Button>} />
      </View>
    );
  }

  const restLeft = active.restEndsAt ? Math.max(0, (active.restEndsAt - now) / 1000) : 0;

  const complete = (we: WorkoutExercise, set: WorkoutSet, index: number) => {
    const ex = getExercise(we.exerciseId);
    if (set.done) {
      haptic.undo();
      return updateSet(we.id, set.id, { done: false });
    }
    // Empty fields fall back to what you did last time (or the set above).
    const prev = previousSets(workouts, we.exerciseId, settings, active.routineId)[index];
    const above = we.sets[index - 1];
    const fill = (k: 'weight' | 'reps' | 'duration' | 'distance') => set[k] ?? prev?.[k] ?? above?.[k];
    const filled: WorkoutSet = { ...set, weight: fill('weight'), reps: fill('reps'), duration: fill('duration'), distance: fill('distance'), done: true };
    updateSet(we.id, set.id, filled);
    haptic.complete();

    if (settings.livePr) {
      const rec = computeRecords(workouts, we.exerciseId, settings);
      active.exercises.forEach((e) => e.exerciseId === we.exerciseId && e.sets.forEach((s) => s.done && s.id !== set.id && addSetToRecords(rec, ex, s)));
      const kinds = setPRs(ex, filled, rec);
      if (kinds.length) {
        haptic.pr();
        setPr(`New PR · ${ex.name}: ${kinds.map((k) => PR_LABEL[k]).join(', ')}`);
      }
    }

    // Rest timer: never before a drop set; in a superset only after the round's last exercise.
    const next = we.sets[index + 1];
    const group = we.supersetId ? active.exercises.filter((e) => e.supersetId === we.supersetId) : [];
    const lastInGroup = !we.supersetId || group[group.length - 1]?.id === we.id;
    if (we.restSec > 0 && next?.type !== 'drop' && lastInGroup) startRest(we.restSec);
  };

  const finish = () => {
    const done = active.exercises.some((e) => e.sets.some((s) => s.done));
    if (!done) return setDialog('finish-empty');
    const saved = finishWorkout();
    haptic.save();
    if (saved) router.replace(`/summary/${saved.id}`);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Row style={styles.header} gap={4}>
        <IconButton icon="chevron-down" onPress={() => router.back()} accessibilityLabel="Minimise workout" />
        <View style={{ flex: 1 }}>
          <RNTextInput value={active.name} onChangeText={(name) => updateActive((w) => ({ ...w, name }))} style={styles.title} accessibilityLabel="Workout name" />
          <Text style={styles.clock}>{fmtClock((now - active.startedAt) / 1000)}</Text>
        </View>
        <Button mode="contained" onPress={finish} style={{ marginRight: 8 }}>
          Finish
        </Button>
      </Row>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 160 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <StatRow>
          <Stat label="Volume" value={fmtVolume(totals.volume, settings)} />
          <Stat label="Sets" value={String(totals.sets)} />
          <Stat label="Reps" value={String(totals.reps)} />
        </StatRow>

        {active.exercises.length === 0 && (
          <Card>
            <Empty icon="dumbbell" title="Empty workout" body="Add exercises to start logging sets." />
          </Card>
        )}

        {active.exercises.map((we, i) => {
          const ex = getExercise(we.exerciseId);
          const prev = previousSets(workouts, we.exerciseId, settings, active.routineId);
          const cols = setColumns(ex, settings);
          let n = 0;
          return (
            <Animated.View key={we.id} layout={layout} entering={enterUp(i)} exiting={exitFade}>
            <Card style={[we.supersetId && { borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
              <ExerciseHeader
                ex={ex}
                restSec={we.restSec}
                onRest={(restSec) => updateExercise(we.id, (e) => ({ ...e, restSec }))}
                inSuperset={!!we.supersetId}
                canSuperset={i < active.exercises.length - 1}
                onSuperset={() => updateActive((w) => ({ ...w, exercises: toggleSuperset(w.exercises, we.id) }))}
                onMoveUp={i > 0 ? () => moveExercise(we.id, -1) : undefined}
                onMoveDown={i < active.exercises.length - 1 ? () => moveExercise(we.id, 1) : undefined}
                onRemove={() => removeExercise(we.id)}
                onWarmups={
                  ex.kind === 'weight_reps'
                    ? () =>
                        updateExercise(we.id, (e) => {
                          const working = Math.max(0, ...e.sets.filter((s) => s.type !== 'warmup').map((s) => s.weight ?? 0), ...prev.map((s) => (s.type !== 'warmup' ? s.weight ?? 0 : 0)));
                          if (!working) return e;
                          const w = warmupSets(working, settings).map((s) => ({ id: uid(), type: 'warmup' as const, weight: s.weight, reps: s.reps, done: false }));
                          return { ...e, sets: [...w, ...e.sets.filter((s) => s.type !== 'warmup' || s.done)] };
                        })
                    : undefined
                }
              />
              <RNTextInput
                value={we.note}
                onChangeText={(note) => updateExercise(we.id, (e) => ({ ...e, note }))}
                placeholder="Note"
                placeholderTextColor={BASE.textFaint}
                style={styles.note}
                multiline
              />
              <Row style={styles.cols}>
                <Text style={[styles.col, { width: 34 }]}>SET</Text>
                <Text style={[styles.col, { flex: 1, textAlign: 'left' }]}>PREVIOUS</Text>
                {cols.map((c) => (
                  <Text key={c} style={[styles.col, { width: c === 'time' ? 76 : c === 'reps' ? 64 : 70 }]}>
                    {c.toUpperCase()}
                  </Text>
                ))}
                {settings.rpe && ex.kind !== 'duration' && ex.kind !== 'distance_time' && <Text style={[styles.col, { width: 40 }]}>RPE</Text>}
                <View style={{ width: 40 }} />
              </Row>
              {we.sets.map((s, si) => {
                if (s.type !== 'warmup') n++;
                const p = prev[si];
                return (
                  <Animated.View key={s.id} layout={layout} entering={enterFade} exiting={exitFade}>
                  <Row style={[styles.setRow, s.done && { backgroundColor: `${colors.primary}1F` }]} gap={6}>
                    <SetBadge type={s.type} index={n} done={s.done} onCycle={() => updateSet(we.id, s.id, { type: nextSetType(s.type) })} onLongPress={() => removeSet(we.id, s.id)} />
                    <Pressable style={{ flex: 1 }} onPress={() => p && updateSet(we.id, s.id, { weight: p.weight, reps: p.reps, duration: p.duration, distance: p.distance })} accessibilityHint="Tap to copy previous values">
                      <Text numberOfLines={1} style={styles.prev}>
                        {p ? describeSet(ex, p, settings) || '—' : '—'}
                      </Text>
                    </Pressable>
                    <SetFields ex={ex} v={s} settings={settings} done={s.done} compact onChange={(patch) => updateSet(we.id, s.id, patch)} />
                    {settings.inlineTimer && ex.kind === 'duration' && !s.done && <InlineTimer onStop={(sec) => updateSet(we.id, s.id, { duration: sec })} />}
                    {settings.rpe && ex.kind !== 'duration' && ex.kind !== 'distance_time' && <RpeButton value={s.rpe} onChange={(rpe) => updateSet(we.id, s.id, { rpe })} />}
                    <Pressable
                      onPress={() => complete(we, s, si)}
                      style={[styles.check, s.done && { backgroundColor: colors.primary }]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: s.done }}
                      accessibilityLabel={`Complete set ${n}`}
                    >
                      <Icon source="check" size={20} color={s.done ? colors.onPrimary : BASE.textFaint} />
                    </Pressable>
                  </Row>
                  </Animated.View>
                );
              })}
              <Button icon="plus" mode="text" compact onPress={() => addSet(we.id)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                Add set
              </Button>
            </Card>
            </Animated.View>
          );
        })}

        <Button
          mode="contained-tonal"
          icon="plus"
          contentStyle={{ height: 48 }}
          onPress={() => {
            setPickHandler(addExercisesToActive);
            router.push('/pick');
          }}
        >
          Add exercises
        </Button>
        <Button textColor={BASE.danger} onPress={() => setDialog('discard')}>
          Discard workout
        </Button>
      </ScrollView>

      {active.restEndsAt ? (
        <Animated.View entering={enterBar} exiting={exitBar} style={[styles.rest, { paddingBottom: 12 + insets.bottom, backgroundColor: BASE.containerHigh }]}>
          <ProgressBar progress={active.restTotal ? restLeft / active.restTotal : 0} color={colors.primary} style={styles.restBar} />
          <Row>
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: BASE.textMuted }}>
                REST
              </Text>
              <Text style={[styles.restClock, { color: colors.primary }]}>{fmtClock(restLeft)}</Text>
            </View>
            <Button mode="outlined" compact onPress={() => adjustRest(-15)}>
              −15
            </Button>
            <Button mode="outlined" compact onPress={() => adjustRest(15)}>
              +15
            </Button>
            <Button mode="contained" compact onPress={skipRest}>
              Skip
            </Button>
          </Row>
        </Animated.View>
      ) : null}

      <Snackbar visible={!!pr} onDismiss={() => setPr(null)} duration={3500} icon="trophy" style={{ marginBottom: active.restEndsAt ? 110 : 16 }}>
        {pr}
      </Snackbar>

      <Portal>
        <Dialog visible={dialog === 'finish-empty'} onDismiss={() => setDialog(null)}>
          <Dialog.Title>No completed sets</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Tick the sets you’ve done to save them. Discard this workout instead?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Keep going</Button>
            <Button
              textColor={BASE.danger}
              onPress={() => {
                setDialog(null);
                haptic.remove();
                discardWorkout();
                router.back();
              }}
            >
              Discard
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={dialog === 'discard'} onDismiss={() => setDialog(null)}>
          <Dialog.Title>Discard workout?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Everything logged in this session will be lost.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Cancel</Button>
            <Button
              textColor={BASE.danger}
              onPress={() => {
                setDialog(null);
                haptic.remove();
                discardWorkout();
                router.back();
              }}
            >
              Discard
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function RpeButton({ value, onChange }: { value?: number; onChange: (v?: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <Pressable onPress={() => setOpen(true)} style={styles.rpe} accessibilityLabel={`RPE ${value ?? 'not set'}`}>
          <Text style={{ color: value ? BASE.text : BASE.textFaint, fontWeight: '600', fontSize: 13 }}>{value ?? '–'}</Text>
        </Pressable>
      }
    >
      <Menu.Item title="Clear" onPress={() => (setOpen(false), onChange(undefined))} />
      {RPE_VALUES.map((v) => (
        <Menu.Item key={v} title={`RPE ${v}`} leadingIcon={v === value ? 'check' : undefined} onPress={() => (setOpen(false), onChange(v))} />
      ))}
    </Menu>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BASE.background },
  header: { paddingRight: 4, paddingVertical: 4 },
  title: { color: BASE.text, fontSize: 18, fontWeight: '700', padding: 0 },
  clock: { color: BASE.textMuted, fontVariant: ['tabular-nums'], fontSize: 13 },
  body: { padding: 12, gap: 12 },
  note: { color: BASE.textMuted, fontSize: 13, paddingVertical: 4, paddingHorizontal: 0 },
  cols: { marginTop: 4, marginBottom: 2 },
  col: { color: BASE.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textAlign: 'center' },
  setRow: { paddingVertical: 4, paddingHorizontal: 4, marginHorizontal: -4, borderRadius: 12 },
  prev: { color: BASE.textFaint, fontSize: 13, fontVariant: ['tabular-nums'] },
  check: { width: 40, height: 38, borderRadius: 10, backgroundColor: BASE.containerHigh, alignItems: 'center', justifyContent: 'center' },
  rpe: { width: 40, height: 38, borderRadius: 10, backgroundColor: BASE.containerHigh, alignItems: 'center', justifyContent: 'center' },
  rest: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 0, gap: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  restBar: { height: 4, marginHorizontal: -16, marginBottom: 8, backgroundColor: 'transparent' },
  restClock: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
