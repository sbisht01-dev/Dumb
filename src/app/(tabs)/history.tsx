import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconButton, Text, useTheme } from 'react-native-paper';
import { Card, Empty, Page, Row, SectionTitle } from '@/components/ui';
import { useStore } from '@/store/store';
import { getExercise } from '@/store/actions';
import { weekStreak, workoutTotals } from '@/store/stats';
import { addMonths, fmtDuration, fmtMonth, fmtVolume, relDay, startOfDay, startOfMonth } from '@/lib/format';
import { BASE } from '@/theme';
import { useNow } from '@/lib/useNow';

export default function History() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const now = useNow();
  const [month, setMonth] = useState(() => startOfMonth(now));

  const inMonth = useMemo(() => workouts.filter((w) => w.startedAt >= month && w.startedAt < addMonths(month, 1)), [workouts, month]);
  const days = useMemo(() => new Set(inMonth.map((w) => startOfDay(w.startedAt))), [inMonth]);
  const streak = useMemo(() => weekStreak(workouts, settings.weekStartsMonday), [workouts, settings.weekStartsMonday]);

  const first = new Date(month);
  const lead = settings.weekStartsMonday ? (first.getDay() + 6) % 7 : first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1).getTime())];
  const weekdays = settings.weekStartsMonday ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = startOfDay(now);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Page>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="headlineMedium" style={styles.h1}>
            History
          </Text>
          <Row gap={6} style={[styles.streak, { backgroundColor: colors.primaryContainer }]}>
            <Icon source="fire" size={16} color={colors.onPrimaryContainer} />
            <Text style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>
              {streak} week{streak === 1 ? '' : 's'}
            </Text>
          </Row>
        </Row>

        <Card index={0}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <IconButton icon="chevron-left" onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month" style={{ margin: 0 }} />
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {fmtMonth(month)}
            </Text>
            <IconButton icon="chevron-right" onPress={() => setMonth(addMonths(month, 1))} disabled={addMonths(month, 1) > now} accessibilityLabel="Next month" style={{ margin: 0 }} />
          </Row>
          <View style={styles.grid}>
            {weekdays.map((d, i) => (
              <Text key={i} style={styles.weekday}>
                {d}
              </Text>
            ))}
            {cells.map((t, i) => {
              const on = t != null && days.has(t);
              return (
                <View key={i} style={styles.cell}>
                  {t != null && (
                    <View style={styles.day} accessibilityLabel={on ? `${new Date(t).getDate()}, workout logged` : undefined}>
                      <Text style={[styles.dayText, t > today && { color: BASE.textFaint }, t === today && { color: colors.primary, fontWeight: '800' }]}>{new Date(t).getDate()}</Text>
                      <View style={[styles.dot, on && { backgroundColor: colors.primary }]} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        <SectionTitle>
          {inMonth.length} workout{inMonth.length === 1 ? '' : 's'} in {new Date(month).toLocaleDateString(undefined, { month: 'long' })}
        </SectionTitle>

        {inMonth.length === 0 ? (
          <Card>
            <Empty icon="calendar-blank-outline" title="Nothing logged this month" body="Finished workouts show up here with all their sets." />
          </Card>
        ) : (
          inMonth.map((w, i) => {
            const t = workoutTotals(w, settings);
            return (
              <Card key={w.id} index={i} onPress={() => router.push(`/session/${w.id}`)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {w.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
                    {relDay(w.startedAt)}
                  </Text>
                </Row>
                <Row gap={16} style={{ marginTop: 6 }}>
                  <Meta icon="clock-outline" text={fmtDuration(t.duration)} />
                  <Meta icon="weight" text={fmtVolume(t.volume, settings)} />
                  <Meta icon="format-list-numbered" text={`${t.sets} sets`} />
                </Row>
                <View style={{ marginTop: 10, gap: 2 }}>
                  {w.exercises.slice(0, 4).map((e) => (
                    <Text key={e.id} variant="bodySmall" style={{ color: BASE.textMuted }} numberOfLines={1}>
                      {e.sets.length} × {getExercise(e.exerciseId).name}
                    </Text>
                  ))}
                  {w.exercises.length > 4 && (
                    <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
                      +{w.exercises.length - 4} more
                    </Text>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </Page>
    </View>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  return (
    <Row gap={4}>
      <Icon source={icon} size={14} color={BASE.textFaint} />
      <Text variant="bodySmall" style={{ color: BASE.textMuted, fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  h1: { fontWeight: '800', letterSpacing: -0.5 },
  streak: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: BASE.textFaint, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  // Always rendered (transparent when empty) so every number sits at the same height.
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dayText: { color: BASE.text, fontSize: 14, fontVariant: ['tabular-nums'] },
});
