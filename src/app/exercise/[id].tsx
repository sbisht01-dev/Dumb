import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconButton, SegmentedButtons, Text } from 'react-native-paper';
import { LineChart, MetricTabs } from '@/components/charts';
import Animated from 'react-native-reanimated';
import { enterFade } from '@/components/motion';
import { Card, Empty, Page, RangeTabs, Row, SectionTitle, Stat, StatRow } from '@/components/ui';
import { describeSet } from '@/components/SetFields';
import { useStore } from '@/store/store';
import { getExercise } from '@/store/actions';
import { computeRecords, exerciseHistory, exerciseSeries, type ExerciseMetric } from '@/store/stats';
import { EQUIPMENT_LABEL, KIND_LABEL, MUSCLE_LABEL } from '@/data/exercises';
import { rangeStart, type Range } from '@/lib/range';
import { fmtClock, fmtDistance, fmtVolume, fmtWeight, num, relDay, toDisplayDistance, toDisplayWeight } from '@/lib/format';
import { BASE } from '@/theme';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useStore((s) => s.customExercises); // re-render after edits
  const ex = getExercise(id);
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const [tab, setTab] = useState<'summary' | 'history' | 'records'>('summary');
  const [range, setRange] = useState<Range>('3M');

  const weighted = ex.kind === 'weight_reps' || ex.kind === 'weighted_bw';
  const metrics: { id: ExerciseMetric; label: string }[] = weighted
    ? [
        { id: 'heaviest', label: 'Heaviest' },
        { id: 'e1rm', label: 'Est. 1RM' },
        { id: 'volume', label: 'Volume' },
        { id: 'reps', label: 'Reps' },
      ]
    : ex.kind === 'duration'
      ? [{ id: 'duration', label: 'Best time' }]
      : ex.kind === 'distance_time'
        ? [
            { id: 'distance', label: 'Distance' },
            { id: 'duration', label: 'Time' },
          ]
        : [{ id: 'reps', label: 'Total reps' }];
  const [metric, setMetric] = useState<ExerciseMetric>(metrics[0].id);

  const records = useMemo(() => computeRecords(workouts, id, settings), [workouts, id, settings]);
  const history = useMemo(() => exerciseHistory(workouts, id), [workouts, id]);
  const series = useMemo(() => exerciseSeries(workouts, id, metric, rangeStart(range), settings), [workouts, id, metric, range, settings]);

  const fmtMetric = (v: number) =>
    metric === 'heaviest' || metric === 'e1rm'
      ? `${num(toDisplayWeight(v, settings))} ${settings.unit}`
      : metric === 'volume'
        ? fmtVolume(v, settings)
        : metric === 'duration'
          ? fmtClock(v)
          : metric === 'distance'
            ? `${num(toDisplayDistance(v, settings), 2)} ${settings.distanceUnit}`
            : `${Math.round(v)} reps`;

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: ex.custom ? () => <IconButton icon="pencil-outline" onPress={() => router.push({ pathname: '/exercise-edit', params: { id: ex.id } })} accessibilityLabel="Edit exercise" /> : undefined,
        }}
      />
      <Page>
        <View>
          <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
            {ex.name}
          </Text>
          <Text variant="bodyMedium" style={{ color: BASE.textMuted }}>
            {MUSCLE_LABEL[ex.primary]}
            {ex.secondary.length ? ` · ${ex.secondary.map((m) => MUSCLE_LABEL[m]).join(', ')}` : ''}
          </Text>
          <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
            {EQUIPMENT_LABEL[ex.equipment]} · {KIND_LABEL[ex.kind]}
          </Text>
        </View>

        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          buttons={[
            { value: 'summary', label: 'Summary' },
            { value: 'history', label: 'History' },
            { value: 'records', label: 'Records', disabled: !weighted },
          ]}
        />

        {history.length === 0 ? (
          <Card>
            <Empty icon="chart-line" title="No sets logged yet" body="Do this exercise in a workout and its records and chart show up here." />
          </Card>
        ) : tab === 'summary' ? (
          <>
            {weighted ? (
              <>
                <StatRow>
                  <Stat label="Heaviest" value={fmtWeight(records.heaviest, settings)} accent />
                  <Stat label="Est. 1RM" value={fmtWeight(records.e1rm, settings)} />
                </StatRow>
                <StatRow>
                  <Stat label="Best set" value={fmtVolume(records.bestSetVolume, settings)} sub="volume" />
                  <Stat label="Best session" value={fmtVolume(records.bestSessionVolume, settings)} sub="volume" />
                </StatRow>
              </>
            ) : ex.kind === 'duration' ? (
              <StatRow>
                <Stat label="Longest" value={fmtClock(records.longestDuration)} accent />
                <Stat label="Sessions" value={String(history.length)} />
              </StatRow>
            ) : ex.kind === 'distance_time' ? (
              <StatRow>
                <Stat label="Longest" value={fmtDistance(records.longestDistance, settings)} accent />
                <Stat label="Longest time" value={fmtClock(records.longestDuration)} />
              </StatRow>
            ) : (
              <StatRow>
                <Stat label="Most reps" value={String(records.mostReps)} sub="in one set" accent />
                <Stat label="Session best" value={String(records.mostSessionReps)} sub="reps" />
              </StatRow>
            )}
            <Card>
              {metrics.length > 1 && <MetricTabs value={metric} onChange={setMetric} items={metrics} />}
              <View style={{ height: 12 }} />
              <RangeTabs value={range} onChange={setRange} />
              <View style={{ height: 12 }} />
              <Animated.View key={metric + range} entering={enterFade}>
                <LineChart points={series} format={fmtMetric} />
              </Animated.View>
            </Card>
          </>
        ) : tab === 'history' ? (
          history.map(({ workout, entry }, i) => (
            <Card key={entry.id} index={i} onPress={() => router.push(`/session/${workout.id}`)}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Text variant="titleSmall" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {workout.name}
                </Text>
                <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
                  {relDay(workout.startedAt)}
                </Text>
              </Row>
              {entry.sets.map((s, i) => (
                <Text key={s.id} variant="bodyMedium" style={{ fontVariant: ['tabular-nums'], color: s.type === 'warmup' ? BASE.textFaint : BASE.text }}>
                  {s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : s.type === 'failure' ? 'F' : i + 1}
                  {'   '}
                  {describeSet(ex, s, settings)}
                </Text>
              ))}
            </Card>
          ))
        ) : (
          <>
            <SectionTitle>Best weight for each rep count</SectionTitle>
            <Card style={{ paddingVertical: 6 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((reps) => (
                <Row key={reps} style={{ paddingVertical: 9, justifyContent: 'space-between' }}>
                  <Text variant="bodyLarge" style={{ color: BASE.textMuted }}>
                    {reps} rep{reps > 1 ? 's' : ''}
                  </Text>
                  <Text variant="bodyLarge" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {records.repBests[reps] ? fmtWeight(records.repBests[reps], settings) : '—'}
                  </Text>
                </Row>
              ))}
            </Card>
          </>
        )}
      </Page>
    </>
  );
}
