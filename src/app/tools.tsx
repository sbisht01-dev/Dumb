import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { Card, Page, Row, SectionTitle } from '@/components/ui';
import { useStore } from '@/store/store';
import { oneRepMax, plateBreakdown, warmupSets } from '@/lib/calc';
import { fromDisplayWeight, num, parseNum, toDisplayWeight } from '@/lib/format';
import { BASE } from '@/theme';

export default function Tools() {
  const settings = useStore((s) => s.settings);
  const { colors } = useTheme();
  const [tool, setTool] = useState<'plates' | '1rm' | 'warmup'>('plates');
  const [target, setTarget] = useState('100');
  const [w, setW] = useState('80');
  const [reps, setReps] = useState('5');

  const targetKg = fromDisplayWeight(parseNum(target) ?? 0, settings);
  const { result, remainder } = plateBreakdown(targetKg, settings.barWeight, settings.plates);
  const e1rm = oneRepMax(fromDisplayWeight(parseNum(w) ?? 0, settings), parseNum(reps) ?? 0);
  const fmt = (kg: number) => `${num(toDisplayWeight(kg, settings))} ${settings.unit}`;

  return (
    <Page>
      <SegmentedButtons
        value={tool}
        onValueChange={(v) => setTool(v as typeof tool)}
        buttons={[
          { value: 'plates', label: 'Plates', icon: 'circle-double' },
          { value: '1rm', label: '1RM', icon: 'arm-flex' },
          { value: 'warmup', label: 'Warm-up', icon: 'fire' },
        ]}
      />

      {tool === 'plates' && (
        <>
          <TextInput mode="outlined" label={`Target weight (${settings.unit})`} keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
          <Card>
            <Text variant="labelLarge" style={{ color: BASE.textMuted }}>
              EACH SIDE OF A {fmt(settings.barWeight).toUpperCase()} BAR
            </Text>
            <View style={styles.bar}>
              <View style={styles.sleeve} />
              {result.flatMap((r) =>
                Array.from({ length: r.count }, (_, i) => (
                  <View key={`${r.plate}-${i}`} style={[styles.plate, { height: 40 + Math.min(80, r.plate * 3), backgroundColor: colors.primary }]}>
                    <Text style={[styles.plateText, { color: colors.onPrimary }]}>{num(toDisplayWeight(r.plate, settings))}</Text>
                  </View>
                )),
              )}
            </View>
            {result.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: BASE.textMuted }}>
                Just the bar.
              </Text>
            ) : (
              result.map((r) => (
                <Row key={r.plate} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text variant="bodyLarge">{fmt(r.plate)}</Text>
                  <Text variant="bodyLarge" style={{ fontWeight: '700' }}>
                    × {r.count}
                  </Text>
                </Row>
              ))
            )}
            {remainder > 0 && (
              <Text variant="bodySmall" style={{ color: BASE.warn, marginTop: 6 }}>
                {fmt(remainder)} can’t be made with your plates.
              </Text>
            )}
          </Card>
          <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
            Bar weight and plate sizes are in More → Settings.
          </Text>
        </>
      )}

      {tool === '1rm' && (
        <>
          <Row gap={8}>
            <TextInput mode="outlined" label={`Weight (${settings.unit})`} keyboardType="decimal-pad" value={w} onChangeText={setW} style={{ flex: 1 }} />
            <TextInput mode="outlined" label="Reps" keyboardType="number-pad" value={reps} onChangeText={setReps} style={{ flex: 1 }} />
          </Row>
          <Card style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="labelLarge" style={{ color: BASE.textMuted }}>
              ESTIMATED ONE-REP MAX
            </Text>
            <Text style={{ fontSize: 44, fontWeight: '900', color: colors.primary }}>{e1rm ? fmt(e1rm) : '—'}</Text>
            <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
              Epley formula · most accurate up to 12 reps
            </Text>
          </Card>
          <SectionTitle>Training percentages</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {[95, 90, 85, 80, 75, 70, 65, 60].map((p) => (
              <Row key={p} style={{ justifyContent: 'space-between', paddingVertical: 7 }}>
                <Text variant="bodyLarge" style={{ color: BASE.textMuted }}>
                  {p}%
                </Text>
                <Text variant="bodyLarge" style={{ fontWeight: '700' }}>
                  {e1rm ? fmt((e1rm * p) / 100) : '—'}
                </Text>
              </Row>
            ))}
          </Card>
        </>
      )}

      {tool === 'warmup' && (
        <>
          <TextInput mode="outlined" label={`Working weight (${settings.unit})`} keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
          <Card style={{ paddingVertical: 6 }}>
            {warmupSets(targetKg, settings).map((s, i) => (
              <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text variant="bodyLarge" style={{ color: BASE.warmup, fontWeight: '800' }}>
                  W{i + 1}
                </Text>
                <Text variant="bodyLarge" style={{ fontWeight: '700' }}>
                  {fmt(s.weight)} × {s.reps}
                </Text>
              </Row>
            ))}
            <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
              <Text variant="bodyLarge" style={{ color: colors.primary, fontWeight: '800' }}>
                Work
              </Text>
              <Text variant="bodyLarge" style={{ fontWeight: '700' }}>
                {fmt(targetKg)}
              </Text>
            </Row>
          </Card>
          <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
            Uses {settings.warmupScheme.map((s) => `${Math.round(s.pct * 100)}%×${s.reps}`).join(', ')}, rounded to your plates. Add them to any exercise from its ⋮ menu.
          </Text>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 130, marginVertical: 10 },
  sleeve: { width: 36, height: 12, borderRadius: 3, backgroundColor: BASE.outline },
  plate: { width: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  plateText: { fontSize: 9, fontWeight: '800', transform: [{ rotate: '-90deg' }], width: 40, textAlign: 'center' },
});
