import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Dialog, List, Menu, Portal, SegmentedButtons, Switch, Text } from 'react-native-paper';
import { Card, Page, SectionTitle } from '@/components/ui';
import { getState, resetAll, useStore } from '@/store/store';
import { updateSettings } from '@/store/actions';
import { REST_OPTIONS } from '@/components/ExerciseHeader';
import { BASE } from '@/theme';
import { fmtClock, num, toDisplayWeight } from '@/lib/format';
import type { Settings } from '@/store/types';
import { loadDemoData } from '@/data/demo';
import { haptic } from '@/lib/haptics';

export default function More() {
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const counts = useStore((s) => s.workouts.length);
  const [restMenu, setRestMenu] = useState(false);
  const [barMenu, setBarMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sample, setSample] = useState(false);

  const toggle = (key: keyof Settings, title: string, description: string) => (
    <List.Item
      title={title}
      description={description}
      descriptionNumberOfLines={2}
      onPress={() => updateSettings({ [key]: !settings[key] } as Partial<Settings>)}
      right={() => <Switch value={settings[key] as boolean} onValueChange={(v) => updateSettings({ [key]: v } as Partial<Settings>)} />}
    />
  );

  const exportData = async () => {
    const { customExercises, routines, workouts, body, settings: s } = getState();
    await Share.share({ title: 'Dumb backup', message: JSON.stringify({ app: 'dumb', version: 1, exportedAt: new Date().toISOString(), customExercises, routines, workouts, body, settings: s }) });
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Page>
        <Text variant="headlineMedium" style={{ fontWeight: '800', letterSpacing: -0.5 }}>
          More
        </Text>

        <Card style={styles.list}>
          <List.Item title="Exercise library" description="Browse, search and create exercises" left={(p) => <List.Icon {...p} icon="book-open-variant" />} onPress={() => router.push('/library')} />
          <List.Item title="Calculators" description="Plates, one-rep max, warm-ups" left={(p) => <List.Icon {...p} icon="calculator-variant-outline" />} onPress={() => router.push('/tools')} />
        </Card>

        <SectionTitle>Units</SectionTitle>
        <Card style={{ gap: 12 }}>
          <SegmentedButtons
            value={settings.unit}
            onValueChange={(v) => updateSettings({ unit: v as Settings['unit'] })}
            buttons={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
          />
          <SegmentedButtons
            value={settings.lengthUnit}
            onValueChange={(v) => updateSettings({ lengthUnit: v as Settings['lengthUnit'] })}
            buttons={[
              { value: 'cm', label: 'Centimetres' },
              { value: 'in', label: 'Inches' },
            ]}
          />
          <SegmentedButtons
            value={settings.distanceUnit}
            onValueChange={(v) => updateSettings({ distanceUnit: v as Settings['distanceUnit'] })}
            buttons={[
              { value: 'km', label: 'Kilometres' },
              { value: 'mi', label: 'Miles' },
            ]}
          />
        </Card>

        <SectionTitle>Workout</SectionTitle>
        <Card style={styles.list}>
          <Menu
            visible={restMenu}
            onDismiss={() => setRestMenu(false)}
            anchor={<List.Item title="Default rest timer" description="Used when you add an exercise" onPress={() => setRestMenu(true)} right={() => <Text style={styles.value}>{settings.defaultRest ? fmtClock(settings.defaultRest) : 'Off'}</Text>} />}
          >
            {REST_OPTIONS.map((s) => (
              <Menu.Item key={s} title={s ? fmtClock(s) : 'Off'} leadingIcon={s === settings.defaultRest ? 'check' : undefined} onPress={() => (setRestMenu(false), updateSettings({ defaultRest: s }))} />
            ))}
          </Menu>
          <List.Item
            title="Previous values"
            description={settings.previousValues === 'any' ? 'From the last time you did the exercise' : 'From the last time in the same routine'}
            onPress={() => updateSettings({ previousValues: settings.previousValues === 'any' ? 'routine' : 'any' })}
            right={() => <Text style={styles.value}>{settings.previousValues === 'any' ? 'Any' : 'Routine'}</Text>}
          />
          {toggle('warmupsInStats', 'Count warm-up sets', 'Include warm-ups in volume, set counts and records')}
          {toggle('rpe', 'RPE tracking', 'Rate perceived exertion (6–10) on each set')}
          {toggle('inlineTimer', 'Inline timer', 'Stopwatch on timed sets like planks')}
          {toggle('livePr', 'Live PR alerts', 'Celebrate records the moment you set them')}
          {toggle('keepAwake', 'Keep screen on', 'During workouts, so you never unlock between sets')}
          {toggle('haptics', 'Haptics', 'Feedback on set completion and timers')}
          {toggle('weekStartsMonday', 'Week starts Monday', 'For streaks, calendar and weekly charts')}
        </Card>

        <SectionTitle>Equipment</SectionTitle>
        <Card style={styles.list}>
          <Menu
            visible={barMenu}
            onDismiss={() => setBarMenu(false)}
            anchor={<List.Item title="Barbell weight" description="Used by plate and warm-up calculators" onPress={() => setBarMenu(true)} right={() => <Text style={styles.value}>{num(toDisplayWeight(settings.barWeight, settings))} {settings.unit}</Text>} />}
          >
            {[20, 15, 10, 7, 25].map((b) => (
              <Menu.Item key={b} title={`${num(toDisplayWeight(b, settings))} ${settings.unit}`} leadingIcon={b === settings.barWeight ? 'check' : undefined} onPress={() => (setBarMenu(false), updateSettings({ barWeight: b }))} />
            ))}
          </Menu>
        </Card>

        <SectionTitle>Data</SectionTitle>
        <Card style={styles.list}>
          <List.Item title="Export backup" description="Share your full log as JSON" left={(p) => <List.Icon {...p} icon="export-variant" />} onPress={exportData} />
          <List.Item title="Load sample data" description="14 weeks of push / pull / legs to explore charts and reports" left={(p) => <List.Icon {...p} icon="flask-outline" />} onPress={() => setSample(true)} />
          <List.Item title="Delete all workout data" titleStyle={{ color: BASE.danger }} description={`${counts} workouts stored on this phone`} left={(p) => <List.Icon {...p} icon="delete-outline" color={BASE.danger} />} onPress={() => setConfirm(true)} />
        </Card>

        <Text variant="bodySmall" style={{ color: BASE.textFaint, textAlign: 'center', marginTop: 12 }}>
          dumb. v1.0 · Free forever. Everything stays on your phone. No account, no ads.
        </Text>
      </Page>

      <Portal>
        <Dialog visible={confirm} onDismiss={() => setConfirm(false)}>
          <Dialog.Title>Delete everything?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Workouts, routines, custom exercises and measurements will be erased. Settings are kept. This can’t be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(false)}>Cancel</Button>
            <Button
              textColor={BASE.danger}
              onPress={() => {
                setConfirm(false);
                haptic.remove();
                resetAll();
              }}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={sample} onDismiss={() => setSample(false)}>
          <Dialog.Title>Load sample data?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Adds about 40 example workouts, three routines and body measurements alongside your own. Use “Delete all workout data” to clear them later.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSample(false)}>Cancel</Button>
            <Button
              onPress={() => {
                setSample(false);
                haptic.save();
                loadDemoData();
              }}
            >
              Load
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4, paddingHorizontal: 0 },
  value: { color: BASE.textMuted, alignSelf: 'center', fontVariant: ['tabular-nums'], fontWeight: '600' },
});
