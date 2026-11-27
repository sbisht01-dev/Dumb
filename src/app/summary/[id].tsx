import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { EASE_OUT } from '@/components/motion';
import { Button, Icon, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { Page, SectionTitle, Stat, StatRow } from '@/components/ui';
import { WorkoutBreakdown } from '@/components/WorkoutBreakdown';
import { useStore } from '@/store/store';
import { saveWorkoutAsRoutine, updateWorkout } from '@/store/actions';
import { workoutPRs, workoutTotals } from '@/store/stats';
import { fmtDuration, fmtVolume } from '@/lib/format';
import { BASE } from '@/theme';
import { haptic } from '@/lib/haptics';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const w = workouts.find((x) => x.id === id);
  const [name, setName] = useState(w?.name ?? '');
  const [note, setNote] = useState(w?.note ?? '');
  const [msg, setMsg] = useState<string | null>(null);

  const totals = useMemo(() => (w ? workoutTotals(w, settings) : null), [w, settings]);
  const prs = useMemo(() => (w ? workoutPRs(workouts, w, settings) : []), [w, workouts, settings]);
  if (!w || !totals) return null;
  const count = workouts.length - workouts.indexOf(w);

  const done = () => {
    haptic.save();
    updateWorkout({ ...w, name: name.trim() || w.name, note });
    router.back();
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: BASE.background }}>
      <Page>
        <View style={styles.hero}>
          <Animated.View entering={ZoomIn.duration(320).easing(EASE_OUT)} style={[styles.medal, { backgroundColor: colors.primary }]}>
            <Icon source="check-bold" size={36} color={colors.onPrimary} />
          </Animated.View>
          <Text variant="headlineMedium" style={{ fontWeight: '800', textAlign: 'center' }}>
            Workout done
          </Text>
          <Text variant="bodyMedium" style={{ color: BASE.textMuted }}>
            That’s your {ordinal(count)} workout. Nice work.
          </Text>
        </View>

        <StatRow>
          <Stat label="Time" value={fmtDuration(totals.duration)} />
          <Stat label="Volume" value={fmtVolume(totals.volume, settings)} accent />
        </StatRow>
        <StatRow>
          <Stat label="Sets" value={String(totals.sets)} />
          <Stat label="Records" value={String(prs.length)} sub={prs.length ? 'new PRs' : 'keep pushing'} />
        </StatRow>

        <TextInput mode="outlined" label="Workout name" value={name} onChangeText={setName} />
        <TextInput mode="outlined" label="How did it feel?" value={note} onChangeText={setNote} multiline />

        <SectionTitle>Exercises</SectionTitle>
        <WorkoutBreakdown workout={w} settings={settings} prs={prs} />

        <Button mode="contained" onPress={done} contentStyle={{ height: 52 }} style={{ marginTop: 8 }}>
          Done
        </Button>
        {!w.routineId && (
          <Button
            mode="outlined"
            icon="content-save-outline"
            onPress={() => {
              if (saveWorkoutAsRoutine(w.id)) setMsg('Saved as a routine');
            }}
          >
            Save as routine
          </Button>
        )}
      </Page>
      <Snackbar visible={!!msg} onDismiss={() => setMsg(null)} duration={2000}>
        {msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  medal: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
