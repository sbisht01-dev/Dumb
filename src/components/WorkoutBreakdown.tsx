import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, IconButton, Text, useTheme } from 'react-native-paper';
import { Card, Row } from './ui';
import { SetBadge, SetFields, describeSet, nextSetType } from './SetFields';
import { getExercise } from '@/store/actions';
import { PR_LABEL, type PrKind } from '@/store/stats';
import { BASE } from '@/theme';
import type { Settings, Workout, WorkoutSet } from '@/store/types';
import { haptic } from '@/lib/haptics';

interface Props {
  workout: Workout;
  settings: Settings;
  prs?: { exerciseId: string; kind: PrKind; set: WorkoutSet }[];
  editing?: boolean;
  onChangeSet?: (exId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  onRemoveSet?: (exId: string, setId: string) => void;
}

export function WorkoutBreakdown({ workout, settings, prs = [], editing, onChangeSet, onRemoveSet }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {workout.exercises.map((we, i) => {
        const ex = getExercise(we.exerciseId);
        let n = 0;
        return (
          <Card key={we.id} index={i} onPress={editing ? undefined : () => router.push(`/exercise/${ex.id}`)}>
            <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: '700' }}>
              {ex.name}
            </Text>
            {we.note ? (
              <Text variant="bodySmall" style={{ color: BASE.textMuted, marginTop: 2 }}>
                {we.note}
              </Text>
            ) : null}
            <View style={{ marginTop: 8, gap: 6 }}>
              {we.sets.map((s) => {
                if (s.type !== 'warmup') n++;
                const setPrs = prs.filter((p) => p.set.id === s.id);
                return editing ? (
                  <Row key={s.id} gap={6}>
                    <SetBadge type={s.type} index={n} onCycle={() => onChangeSet?.(we.id, s.id, { type: nextSetType(s.type) })} />
                    <SetFields ex={ex} v={s} settings={settings} onChange={(patch) => onChangeSet?.(we.id, s.id, patch)} />
                    <View style={{ flex: 1 }} />
                    <IconButton icon="close" size={16} onPress={() => (haptic.remove(), onRemoveSet?.(we.id, s.id))} accessibilityLabel="Remove set" style={{ margin: 0 }} />
                  </Row>
                ) : (
                  <Row key={s.id} gap={10}>
                    <Text style={[styles.idx, s.type !== 'normal' && { color: s.type === 'warmup' ? BASE.warmup : s.type === 'drop' ? BASE.drop : BASE.failure }]}>
                      {s.type === 'normal' ? n : s.type[0].toUpperCase()}
                    </Text>
                    <Text style={styles.set}>
                      {describeSet(ex, s, settings)}
                      {s.rpe ? <Text style={{ color: BASE.textFaint }}> @ {s.rpe}</Text> : null}
                    </Text>
                    {setPrs.length > 0 && (
                      <Row gap={4} style={styles.pr}>
                        <Icon source="trophy" size={13} color={BASE.pr} />
                        <Text style={styles.prText}>{setPrs.map((p) => PR_LABEL[p.kind]).join(' · ')}</Text>
                      </Row>
                    )}
                  </Row>
                );
              })}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  idx: { width: 18, color: BASE.textFaint, fontWeight: '800', fontVariant: ['tabular-nums'] },
  set: { flex: 1, color: BASE.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  pr: { backgroundColor: '#FFD16622', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 1 },
  prText: { color: BASE.pr, fontSize: 11, fontWeight: '700' },
});
