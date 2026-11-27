import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Chip, Icon, Text, useTheme } from 'react-native-paper';
import { HBars } from '@/components/charts';
import { Card, Empty, Page, Row, SectionTitle, Stat, StatRow } from '@/components/ui';
import { describeSet } from '@/components/SetFields';
import { useStore } from '@/store/store';
import { getExercise } from '@/store/actions';
import { PR_LABEL, monthReport, monthsWithWorkouts } from '@/store/stats';
import { addMonths, fmtDuration, fmtMonth, fmtVolume, startOfMonth } from '@/lib/format';
import { BASE } from '@/theme';
import { useNow } from '@/lib/useNow';

export default function Report() {
  const params = useLocalSearchParams<{ month?: string }>();
  const { colors } = useTheme();
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const now = useNow();
  const lastMonth = addMonths(startOfMonth(now), -1);
  const [month, setMonth] = useState(params.month ? Number(params.month) : lastMonth);

  const archive = useMemo(() => monthsWithWorkouts(workouts).filter((m) => m < startOfMonth(now)), [workouts, now]);
  const r = useMemo(() => monthReport(workouts, month, settings), [workouts, month, settings]);

  const delta = (a: number, b: number, f: (v: number) => string) => (b === 0 ? (a ? 'new' : undefined) : `${a >= b ? '▲' : '▼'} ${f(Math.abs(a - b))} vs prior`);
  const prevMuscles = Object.fromEntries(r.prevMuscles.map((m) => [m.group, m.sets]));
  const daysInMonth = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate();

  return (
    <Page>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {[lastMonth, ...archive.filter((m) => m !== lastMonth)].map((m) => (
          <Chip key={m} selected={m === month} showSelectedOverlay compact onPress={() => setMonth(m)}>
            {fmtMonth(m)}
          </Chip>
        ))}
      </ScrollView>

      {r.totals.workouts === 0 ? (
        <Card>
          <Empty icon="calendar-blank-outline" title={`No workouts in ${fmtMonth(month)}`} body="Train this month and next month's report will recap it here." />
        </Card>
      ) : (
        <>
          <Row gap={8}>
            <Text variant="headlineSmall" style={{ fontWeight: '800', flex: 1 }}>
              {fmtMonth(month)}
            </Text>
          </Row>
          <StatRow>
            <Stat label="Workouts" value={String(r.totals.workouts)} sub={delta(r.totals.workouts, r.previous.workouts, String)} accent />
            <Stat label="Time" value={fmtDuration(r.totals.duration)} sub={delta(r.totals.duration, r.previous.duration, fmtDuration)} />
          </StatRow>
          <StatRow>
            <Stat label="Volume" value={fmtVolume(r.totals.volume, settings)} sub={delta(r.totals.volume, r.previous.volume, (v) => fmtVolume(v, settings))} />
            <Stat label="Sets" value={String(r.totals.sets)} sub={delta(r.totals.sets, r.previous.sets, String)} />
          </StatRow>

          <SectionTitle>Active days · {r.days.size}</SectionTitle>
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <View key={d} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: r.days.has(d) ? colors.primary : BASE.containerHigh }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: r.days.has(d) ? colors.onPrimary : BASE.textFaint }}>{d}</Text>
                </View>
              ))}
            </View>
          </Card>

          <SectionTitle>Records · {r.prs.length}</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {r.prs.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: BASE.textMuted, paddingVertical: 10 }}>
                No new records this month — consistency is still a win.
              </Text>
            ) : (
              r.prs.slice(0, 12).map((p, i) => {
                const ex = getExercise(p.exerciseId);
                return (
                  <Row key={i} gap={12} style={{ paddingVertical: 8 }}>
                    <Icon source="trophy" size={18} color={BASE.pr} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" numberOfLines={1} onPress={() => router.push(`/session/${p.workoutId}`)}>
                        {ex.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
                        {PR_LABEL[p.kind]} · {describeSet(ex, p.set, settings)}
                      </Text>
                    </View>
                  </Row>
                );
              })
            )}
          </Card>

          <SectionTitle>Sets per muscle vs prior month</SectionTitle>
          <Card>
            <HBars rows={r.muscles.map((m) => ({ label: m.group, v: m.sets }))} format={(v) => `${Math.round(v * 10) / 10}`} compare={prevMuscles} />
          </Card>

          <SectionTitle>Top exercises</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {r.top.map((t, i) => (
              <Row key={t.id} gap={12} style={{ paddingVertical: 9 }}>
                <Text style={{ width: 18, color: BASE.textFaint, fontWeight: '800' }}>{i + 1}</Text>
                <Text variant="bodyLarge" style={{ flex: 1 }} numberOfLines={1} onPress={() => router.push(`/exercise/${t.id}`)}>
                  {getExercise(t.id).name}
                </Text>
                <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
                  {t.n}×
                </Text>
              </Row>
            ))}
          </Card>
        </>
      )}
    </Page>
  );
}
