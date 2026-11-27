import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FAB, Snackbar, Text, useTheme } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { LineChart } from '@/components/charts';
import { Card, Empty, Page, RangeTabs, Row, SectionTitle, Stat, StatRow } from '@/components/ui';
import { RadialPicker } from '@/components/RadialPicker';
import { enterFade } from '@/components/motion';
import { useStore } from '@/store/store';
import { MEASURES, RADIAL_ORDER, fmtMeasure, measureMeta, measureUnit, toDisplayMeasure } from '@/data/measures';
import { rangeStart, type Range } from '@/lib/range';
import { fmtDate, num } from '@/lib/format';
import { BASE } from '@/theme';
import type { MeasureKey } from '@/store/types';

const FAB_SIZE = 56;
const GAP = 16;

export default function Body() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const body = useStore((s) => s.body);
  const settings = useStore((s) => s.settings);
  const [key, setKey] = useState<MeasureKey>('weight');
  const [range, setRange] = useState<Range>('3M');
  const [hint, setHint] = useState(false);

  const latest = (k: MeasureKey) => body.find((b) => b.values[k] != null)?.values[k];
  const previous = (k: MeasureKey) => body.filter((b) => b.values[k] != null)[1]?.values[k];

  const radialItems = useMemo(() => RADIAL_ORDER.map((r) => ({ key: r.key, label: r.short, muted: !body.some((b) => b.values[r.key] != null) })), [body]);

  const points = useMemo(() => {
    const since = rangeStart(range);
    return body
      .filter((b) => b.values[key] != null && b.date >= since)
      .map((b) => ({ t: b.date, v: toDisplayMeasure(key, b.values[key]!, settings) }))
      .reverse();
  }, [body, key, range, settings]);

  const delta = (k: MeasureKey) => {
    const a = latest(k);
    const b = previous(k);
    if (a == null || b == null) return undefined;
    const d = toDisplayMeasure(k, a, settings) - toDisplayMeasure(k, b, settings);
    return `${d >= 0 ? '+' : ''}${num(d)} ${measureUnit(k, settings)} since last`;
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Page contentStyle={{ paddingBottom: 200 }}>
        <Text variant="headlineMedium" style={{ fontWeight: '800', letterSpacing: -0.5 }}>
          Body
        </Text>

        {body.length === 0 ? (
          <Card index={0}>
            <Empty icon="human-handsup" title="Track more than the bar" body="Log body weight, body fat and 14 measurements. Each gets its own chart." />
          </Card>
        ) : (
          <>
            <StatRow>
              <Stat label="Weight" value={fmtMeasure('weight', latest('weight'), settings)} sub={delta('weight')} accent />
              <Stat label="Body fat" value={fmtMeasure('bodyFat', latest('bodyFat'), settings)} sub={delta('bodyFat')} />
            </StatRow>

            <Card index={1}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelLarge" style={{ color: colors.primary, letterSpacing: 0.6 }}>
                    {measureMeta(key).label.toUpperCase()}
                  </Text>
                  <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
                    Hold the dial button to switch
                  </Text>
                </View>
                <RangeTabs value={range} onChange={setRange} />
              </Row>
              <Animated.View key={key + range} entering={enterFade}>
                <LineChart points={points} format={(v) => `${num(v)} ${measureUnit(key, settings)}`} />
              </Animated.View>
            </Card>

            <SectionTitle>Entries</SectionTitle>
            {body.map((b, i) => {
              const filled = MEASURES.filter((m) => b.values[m.key] != null);
              return (
                <Card key={b.id} index={i + 2} onPress={() => router.push({ pathname: '/measure', params: { id: b.id } })}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                      {fmtDate(b.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
                      {filled.length} value{filled.length === 1 ? '' : 's'}
                    </Text>
                  </Row>
                  <Text variant="bodySmall" style={{ color: BASE.textMuted, marginTop: 4 }} numberOfLines={2}>
                    {filled.map((m) => `${m.label} ${fmtMeasure(m.key, b.values[m.key], settings)}`).join(' · ')}
                  </Text>
                </Card>
              );
            })}
          </>
        )}
      </Page>

      <FAB icon="plus" label="Log" style={{ position: 'absolute', right: GAP, bottom: GAP }} onPress={() => router.push('/measure')} />

      {body.length > 0 && (
        <RadialPicker
          items={radialItems}
          value={key}
          onChange={(k) => setKey(k as MeasureKey)}
          icon="tape-measure"
          bottom={GAP + FAB_SIZE + GAP}
          right={GAP}
          accessibilityLabel="Choose which measurement to chart"
          onHint={() => setHint(true)}
        />
      )}

      <Snackbar visible={hint} onDismiss={() => setHint(false)} duration={2200} style={{ marginBottom: GAP + FAB_SIZE + GAP + FAB_SIZE + 8 }}>
        Press and hold, then slide to a measurement
      </Snackbar>
    </View>
  );
}
