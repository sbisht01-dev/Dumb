import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { BarChart, HBars, MetricTabs } from '@/components/charts';
import Animated from 'react-native-reanimated';
import { enterFade } from '@/components/motion';
import { Card, Empty, Page, RangeTabs, Row, SectionTitle } from '@/components/ui';
import { useStore } from '@/store/store';
import { getExercise } from '@/store/actions';
import { muscleSets, topExercises, weeklyBuckets } from '@/store/stats';
import { rangeStart, type Range } from '@/lib/range';
import { addMonths, fmtDate, fmtDuration, fmtMonth, fmtVolume, startOfMonth } from '@/lib/format';
import { BASE } from '@/theme';
import { useNow } from '@/lib/useNow';

type WeekMetric = 'workouts' | 'duration' | 'volume' | 'reps';
const WEEKS: Record<Range, number> = { '1M': 5, '3M': 13, '1Y': 52, ALL: 104 };

export default function Progress() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const [range, setRange] = useState<Range>('3M');
  const [metric, setMetric] = useState<WeekMetric>('workouts');

  const since = rangeStart(range);
  const weeks = useMemo(() => weeklyBuckets(workouts, WEEKS[range], settings), [workouts, range, settings]);
  const muscles = useMemo(() => muscleSets(workouts, since, Infinity, settings), [workouts, since, settings]);
  const top = useMemo(() => topExercises(workouts, since, Infinity, 6), [workouts, since]);
  const now = useNow();
  const lastMonth = addMonths(startOfMonth(now), -1);

  const fmt = (v: number) => (metric === 'duration' ? fmtDuration(v) : metric === 'volume' ? fmtVolume(v, settings) : String(Math.round(v)));

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Page>
        <Text variant="headlineMedium" style={{ fontWeight: '800', letterSpacing: -0.5 }}>
          Progress
        </Text>

        <Card index={0} onPress={() => router.push({ pathname: '/report', params: { month: String(lastMonth) } })} style={{ backgroundColor: colors.primaryContainer }}>
          <Row gap={14}>
            <Icon source="file-chart-outline" size={28} color={colors.onPrimaryContainer} />
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>
                {fmtMonth(lastMonth)} report
              </Text>
              <Text variant="bodySmall" style={{ color: colors.onPrimaryContainer, opacity: 0.8 }}>
                Workouts, volume, records and muscles vs the month before
              </Text>
            </View>
            <Icon source="chevron-right" size={22} color={colors.onPrimaryContainer} />
          </Row>
        </Card>

        <RangeTabs value={range} onChange={setRange} />

        {workouts.length === 0 ? (
          <Card>
            <Empty icon="chart-line" title="Your charts start with one workout" body="Finish a session and your weekly trends, muscle split and top lifts appear here." />
          </Card>
        ) : (
          <>
            <Card index={1}>
              <MetricTabs
                value={metric}
                onChange={setMetric}
                items={[
                  { id: 'workouts', label: 'Workouts' },
                  { id: 'duration', label: 'Time' },
                  { id: 'volume', label: 'Volume' },
                  { id: 'reps', label: 'Reps' },
                ]}
              />
              <View style={{ height: 12 }} />
              <Animated.View key={metric + range} entering={enterFade}>
                <BarChart data={weeks.map((b) => ({ key: b.start, v: b[metric] }))} format={fmt} labelFor={(k) => `week of ${fmtDate(k)}`} />
              </Animated.View>
            </Card>

            <SectionTitle>Sets per muscle group</SectionTitle>
            <Card index={2}>
              <HBars rows={muscles.map((m) => ({ label: m.group, v: m.sets }))} format={(v) => `${Math.round(v * 10) / 10}`} />
              <Text variant="bodySmall" style={{ color: BASE.textFaint, marginTop: 10 }}>
                Primary muscle counts 1 set, secondary muscles ½.
              </Text>
            </Card>

            <SectionTitle action={<Button compact onPress={() => router.push('/library')}>All exercises</Button>}>Most trained</SectionTitle>
            <Card index={3} style={{ paddingVertical: 6 }}>
              {top.map((t, i) => (
                <Row key={t.id} style={{ paddingVertical: 10 }} gap={12}>
                  <Text style={{ width: 18, color: BASE.textFaint, fontWeight: '800' }}>{i + 1}</Text>
                  <Text variant="bodyLarge" style={{ flex: 1 }} numberOfLines={1} onPress={() => router.push(`/exercise/${t.id}`)}>
                    {getExercise(t.id).name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
                    {t.n} session{t.n === 1 ? '' : 's'}
                  </Text>
                </Row>
              ))}
            </Card>
          </>
        )}
      </Page>
    </View>
  );
}
