import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Dialog, Icon, IconButton, Menu, Portal, Text, useTheme } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { Card, Empty, Page, Row, SectionTitle, Stat, StatRow } from '@/components/ui';
import { exitFade, layout } from '@/components/motion';
import { useStore } from '@/store/store';
import { deleteRoutine, discardWorkout, duplicateRoutine, getExercise, startWorkout } from '@/store/actions';
import { weekStreak, weeklyBuckets } from '@/store/stats';
import { fmtDuration } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { BASE } from '@/theme';
import type { Routine } from '@/store/types';

export default function Train() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const routines = useStore((s) => s.routines);
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const active = useStore((s) => s.active);
  const [confirm, setConfirm] = useState<null | { routineId?: string }>(null);

  const week = useMemo(() => weeklyBuckets(workouts, 1, settings)[0], [workouts, settings]);
  const streak = useMemo(() => weekStreak(workouts, settings.weekStartsMonday), [workouts, settings.weekStartsMonday]);

  const start = (routineId?: string) => {
    if (active) return setConfirm({ routineId });
    haptic.start();
    startWorkout(routineId);
    router.push('/active');
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Page>
        <View style={styles.header}>
          <Text style={[styles.brand, { color: colors.primary }]}>dumb.</Text>
          <IconButton icon="calculator-variant-outline" onPress={() => router.push('/tools')} accessibilityLabel="Calculators" />
        </View>

        <StatRow>
          <Stat label="This week" value={String(week.workouts)} sub={week.workouts === 1 ? 'workout' : 'workouts'} accent />
          <Stat label="Time" value={fmtDuration(week.duration)} sub="trained" />
          <Stat label="Streak" value={String(streak)} sub={streak === 1 ? 'week' : 'weeks'} />
        </StatRow>

        <Card onPress={() => start()} index={0} style={[styles.quick, { backgroundColor: colors.primaryContainer }]}>
          <View style={[styles.quickIcon, { backgroundColor: colors.primary }]}>
            <Icon source="plus" size={26} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>
              Start empty workout
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onPrimaryContainer, opacity: 0.8 }}>
              Add exercises as you go
            </Text>
          </View>
          <Icon source="chevron-right" size={24} color={colors.onPrimaryContainer} />
        </Card>

        <SectionTitle action={<IconButton icon="plus" size={22} onPress={() => router.push('/routine/new')} accessibilityLabel="New routine" />}>Routines</SectionTitle>

        {routines.length === 0 ? (
          <Card index={1}>
            <Empty
              icon="clipboard-list-outline"
              title="No routines yet"
              body="Plan your sessions once, then start them in one tap."
              action={
                <Button mode="contained" icon="plus" onPress={() => router.push('/routine/new')} style={{ marginTop: 8 }}>
                  Create routine
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {routines.map((r, i) => (
              <Animated.View key={r.id} layout={layout} exiting={exitFade}>
                <RoutineCard routine={r} index={i + 1} onStart={() => start(r.id)} />
              </Animated.View>
            ))}
            <Button mode="outlined" icon="plus" onPress={() => router.push('/routine/new')} contentStyle={{ height: 48 }}>
              New routine
            </Button>
          </>
        )}
      </Page>

      <Portal>
        <Dialog visible={!!confirm} onDismiss={() => setConfirm(null)}>
          <Dialog.Title>Workout in progress</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">You already have a workout running. Resume it, or discard it and start a new one?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor={BASE.danger}
              onPress={() => {
                haptic.start();
                discardWorkout();
                const r = confirm?.routineId;
                setConfirm(null);
                startWorkout(r);
                router.push('/active');
              }}
            >
              Discard & start
            </Button>
            <Button
              onPress={() => {
                setConfirm(null);
                router.push('/active');
              }}
            >
              Resume
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function RoutineCard({ routine, index, onStart }: { routine: Routine; index: number; onStart: () => void }) {
  const [menu, setMenu] = useState(false);
  const names = routine.exercises.map((e) => getExercise(e.exerciseId).name);
  return (
    <Card index={index} onPress={() => router.push(`/routine/${routine.id}`)}>
      <Row>
        <Text variant="titleMedium" style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
          {routine.name}
        </Text>
        <Menu visible={menu} onDismiss={() => setMenu(false)} anchor={<IconButton icon="dots-vertical" size={20} onPress={() => setMenu(true)} style={{ margin: -8 }} accessibilityLabel="Routine options" />}>
          <Menu.Item leadingIcon="pencil-outline" title="Edit" onPress={() => (setMenu(false), router.push(`/routine/${routine.id}`))} />
          <Menu.Item leadingIcon="content-copy" title="Duplicate" onPress={() => (setMenu(false), haptic.save(), duplicateRoutine(routine.id))} />
          <Menu.Item leadingIcon="delete-outline" title="Delete" titleStyle={{ color: BASE.danger }} onPress={() => (setMenu(false), haptic.remove(), deleteRoutine(routine.id))} />
        </Menu>
      </Row>
      <Text variant="bodySmall" style={{ color: BASE.textMuted, marginTop: 2, marginBottom: 12 }} numberOfLines={2}>
        {names.length ? `${names.length} exercises · ${names.join(' · ')}` : 'No exercises yet'}
      </Text>
      <Button mode="contained" icon="play" onPress={onStart} disabled={!routine.exercises.length} contentStyle={{ height: 44 }}>
        Start routine
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  brand: { fontSize: 34, fontWeight: '900', letterSpacing: -1.5 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
