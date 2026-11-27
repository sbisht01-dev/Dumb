import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, IconButton, Text } from 'react-native-paper';
import { Card, Page, Row, SectionTitle } from '@/components/ui';
import { getState, useStore } from '@/store/store';
import { deleteBodyEntry, saveBodyEntry } from '@/store/actions';
import { MEASURES, fromDisplayMeasure, measureUnit, toDisplayMeasure } from '@/data/measures';
import { DAY, fmtDateLong, num, parseNum, startOfDay } from '@/lib/format';
import { BASE } from '@/theme';
import type { MeasureKey } from '@/store/types';
import { haptic } from '@/lib/haptics';

export default function Measure() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const settings = useStore((s) => s.settings);
  const existing = getState().body.find((b) => b.id === id);
  const [date, setDate] = useState(existing?.date ?? startOfDay());
  const [text, setText] = useState<Partial<Record<MeasureKey, string>>>(() =>
    Object.fromEntries(Object.entries(existing?.values ?? {}).map(([k, v]) => [k, num(toDisplayMeasure(k as MeasureKey, v as number, settings))])),
  );

  const save = () => {
    const values: Partial<Record<MeasureKey, number>> = {};
    for (const m of MEASURES) {
      const n = parseNum(text[m.key] ?? '');
      if (n != null) values[m.key] = fromDisplayMeasure(m.key, n, settings);
    }
    haptic.save();
    if (Object.keys(values).length) saveBodyEntry({ id: existing?.id, date, values });
    router.back();
  };

  const field = (k: MeasureKey, label: string) => (
    <Row key={k} style={styles.field}>
      <Text variant="bodyLarge" style={{ flex: 1 }}>
        {label}
      </Text>
      <TextInput
        value={text[k] ?? ''}
        onChangeText={(t) => setText((x) => ({ ...x, [k]: t }))}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={BASE.textFaint}
        style={styles.input}
        accessibilityLabel={`${label} in ${measureUnit(k, settings)}`}
      />
      <Text style={styles.unit}>{measureUnit(k, settings)}</Text>
    </Row>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button mode="contained-tonal" compact onPress={save}>
              Save
            </Button>
          ),
        }}
      />
      <Page>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <IconButton icon="chevron-left" onPress={() => setDate((d) => d - DAY)} accessibilityLabel="Previous day" />
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {date === startOfDay() ? 'Today' : fmtDateLong(date)}
            </Text>
            <IconButton icon="chevron-right" disabled={date >= startOfDay()} onPress={() => setDate((d) => d + DAY)} accessibilityLabel="Next day" />
          </Row>
        </Card>
        <SectionTitle>Body</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>{MEASURES.slice(0, 2).map((m) => field(m.key, m.label))}</Card>
        <SectionTitle>Measurements</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>{MEASURES.slice(2).map((m) => field(m.key, m.label))}</Card>
        {existing && (
          <Button
            textColor={BASE.danger}
            onPress={() => {
              haptic.remove();
              deleteBodyEntry(existing.id);
              router.back();
            }}
          >
            Delete entry
          </Button>
        )}
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  field: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BASE.outlineVariant },
  input: { width: 90, height: 40, borderRadius: 10, backgroundColor: BASE.containerHigh, color: BASE.text, textAlign: 'right', paddingHorizontal: 12, fontSize: 16, fontWeight: '600' },
  unit: { width: 28, color: BASE.textMuted },
});
