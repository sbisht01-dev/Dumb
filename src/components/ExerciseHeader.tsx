import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { MUSCLE_LABEL } from '@/data/exercises';
import { BASE } from '@/theme';
import { fmtClock } from '@/lib/format';
import type { Exercise } from '@/store/types';
import { haptic } from '@/lib/haptics';

export const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

interface Props {
  ex: Exercise;
  restSec: number;
  onRest: (sec: number) => void;
  inSuperset: boolean;
  canSuperset: boolean;
  onSuperset: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  onWarmups?: () => void;
  extra?: { title: string; icon: string; onPress: () => void }[];
}

export function ExerciseHeader({ ex, restSec, onRest, inSuperset, canSuperset, onSuperset, onMoveUp, onMoveDown, onRemove, onWarmups, extra = [] }: Props) {
  const { colors } = useTheme();
  const [menu, setMenu] = useState(false);
  const [restMenu, setRestMenu] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable style={{ flex: 1 }} onPress={() => router.push(`/exercise/${ex.id}`)} accessibilityRole="link" accessibilityHint="Opens exercise history">
        <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: '700' }} numberOfLines={1}>
          {ex.name}
        </Text>
        <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
          {MUSCLE_LABEL[ex.primary]}
          {inSuperset ? ' · Superset' : ''}
        </Text>
      </Pressable>
      <Menu
        visible={restMenu}
        onDismiss={() => setRestMenu(false)}
        anchor={
          <Pressable onPress={() => setRestMenu(true)} style={styles.rest} accessibilityLabel={`Rest timer ${restSec ? fmtClock(restSec) : 'off'}`}>
            <Icon source="timer-outline" size={15} color={restSec ? BASE.textMuted : BASE.textFaint} />
            <Text style={[styles.restText, !restSec && { color: BASE.textFaint }]}>{restSec ? fmtClock(restSec) : 'Off'}</Text>
          </Pressable>
        }
      >
        {REST_OPTIONS.map((s) => (
          <Menu.Item key={s} title={s ? fmtClock(s) : 'Off'} leadingIcon={s === restSec ? 'check' : undefined} onPress={() => (setRestMenu(false), onRest(s))} />
        ))}
      </Menu>
      <Menu visible={menu} onDismiss={() => setMenu(false)} anchor={<IconButton icon="dots-vertical" size={20} onPress={() => setMenu(true)} style={{ margin: 0 }} accessibilityLabel="Exercise options" />}>
        {extra.map((e) => (
          <Menu.Item key={e.title} leadingIcon={e.icon} title={e.title} onPress={() => (setMenu(false), e.onPress())} />
        ))}
        {onWarmups && <Menu.Item leadingIcon="fire" title="Add warm-up sets" onPress={() => (setMenu(false), onWarmups())} />}
        {(inSuperset || canSuperset) && <Menu.Item leadingIcon="link-variant" title={inSuperset ? 'Remove superset' : 'Superset with next'} onPress={() => (setMenu(false), onSuperset())} />}
        {onMoveUp && <Menu.Item leadingIcon="arrow-up" title="Move up" onPress={() => (setMenu(false), onMoveUp())} />}
        {onMoveDown && <Menu.Item leadingIcon="arrow-down" title="Move down" onPress={() => (setMenu(false), onMoveDown())} />}
        <Menu.Item leadingIcon="close" title="Remove exercise" titleStyle={{ color: BASE.danger }} onPress={() => (setMenu(false), haptic.remove(), onRemove())} />
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rest: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 8, backgroundColor: BASE.containerHigh },
  restText: { fontSize: 12, fontWeight: '600', color: BASE.textMuted, fontVariant: ['tabular-nums'] },
});
