import { useMemo, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, Dialog, IconButton, Menu, Portal, Snackbar, Text, TextInput } from 'react-native-paper';
import { Page, SectionTitle, Stat, StatRow } from '@/components/ui';
import { WorkoutBreakdown } from '@/components/WorkoutBreakdown';
import { useStore } from '@/store/store';
import { deleteWorkout, saveWorkoutAsRoutine, updateWorkout } from '@/store/actions';
import { workoutPRs, workoutTotals } from '@/store/stats';
import { clone, fmtDateLong, fmtDuration, fmtTime, fmtVolume } from '@/lib/format';
import { BASE } from '@/theme';
import type { Workout } from '@/store/types';
import { haptic } from '@/lib/haptics';

export default function Session() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const saved = workouts.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Workout | undefined>(undefined);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const w = editing ? draft : saved;
  const totals = useMemo(() => (w ? workoutTotals(w, settings) : null), [w, settings]);
  const prs = useMemo(() => (saved ? workoutPRs(workouts, saved, settings) : []), [saved, workouts, settings]);
  if (!w || !totals) return null;
  const startEditing = () => {
    setDraft(clone(w));
    setEditing(true);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: editing ? 'Edit workout' : '',
          headerRight: () =>
            editing ? (
              <Button
                mode="contained-tonal"
                compact
                onPress={() => {
                  haptic.save();
                  if (draft) updateWorkout({ ...draft, exercises: draft.exercises.filter((e) => e.sets.length) });
                  setEditing(false);
                }}
              >
                Save
              </Button>
            ) : (
              <Menu visible={menu} onDismiss={() => setMenu(false)} anchor={<IconButton icon="dots-vertical" onPress={() => setMenu(true)} accessibilityLabel="Workout options" />}>
                <Menu.Item leadingIcon="pencil-outline" title="Edit" onPress={() => (setMenu(false), startEditing())} />
                <Menu.Item
                  leadingIcon="content-save-outline"
                  title="Save as routine"
                  onPress={() => {
                    setMenu(false);
                    if (saveWorkoutAsRoutine(w.id)) setMsg('Saved as a routine');
                  }}
                />
                <Menu.Item leadingIcon="delete-outline" title="Delete" titleStyle={{ color: BASE.danger }} onPress={() => (setMenu(false), setConfirm(true))} />
              </Menu>
            ),
        }}
      />
      <Page>
        {editing && draft ? (
          <>
            <TextInput mode="outlined" label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
            <TextInput mode="outlined" label="Notes" value={draft.note} onChangeText={(note) => setDraft({ ...draft, note })} multiline />
          </>
        ) : (
          <>
            <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
              {w.name}
            </Text>
            <Text variant="bodyMedium" style={{ color: BASE.textMuted, marginTop: -6 }}>
              {fmtDateLong(w.startedAt)} · {fmtTime(w.startedAt)}
            </Text>
            {w.note ? <Text variant="bodyMedium">{w.note}</Text> : null}
          </>
        )}
        <StatRow>
          <Stat label="Time" value={fmtDuration(totals.duration)} />
          <Stat label="Volume" value={fmtVolume(totals.volume, settings)} accent />
          <Stat label="Sets" value={String(totals.sets)} />
        </StatRow>
        <SectionTitle>{prs.length ? `${prs.length} personal record${prs.length > 1 ? 's' : ''}` : 'Exercises'}</SectionTitle>
        <WorkoutBreakdown
          workout={w}
          settings={settings}
          prs={editing ? [] : prs}
          editing={editing}
          onChangeSet={(exId, setId, patch) =>
            setDraft((d) => d && { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : e)) })
          }
          onRemoveSet={(exId, setId) => setDraft((d) => d && { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e)) })}
        />
        {editing && (
          <Button onPress={() => setEditing(false)} textColor={BASE.textMuted}>
            Cancel editing
          </Button>
        )}
      </Page>
      <Portal>
        <Dialog visible={confirm} onDismiss={() => setConfirm(false)}>
          <Dialog.Title>Delete workout?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">It will be removed from your history and stats.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(false)}>Cancel</Button>
            <Button
              textColor={BASE.danger}
              onPress={() => {
                setConfirm(false);
                haptic.remove();
                router.back();
                deleteWorkout(w.id);
              }}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={!!msg} onDismiss={() => setMsg(null)} duration={2000}>
        {msg}
      </Snackbar>
    </>
  );
}
