import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { NumField } from './ui';
import { BASE, SET_TYPE_STYLE } from '@/theme';
import { fmtClock, fromDisplayDistance, fromDisplayWeight, num, round, toDisplayDistance, toDisplayWeight } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/useNow';
import type { Exercise, Settings, SetType, SetValues } from '@/store/types';

const ORDER: SetType[] = ['normal', 'warmup', 'failure', 'drop'];
export const nextSetType = (t: SetType) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];

export function setColumns(ex: Exercise, s: Settings) {
  switch (ex.kind) {
    case 'weight_reps':
      return [s.unit, 'reps'];
    case 'weighted_bw':
      return [`+${s.unit}`, 'reps'];
    case 'assisted_bw':
      return [`−${s.unit}`, 'reps'];
    case 'bodyweight':
      return ['reps'];
    case 'duration':
      return ['time'];
    case 'distance_time':
      return [s.distanceUnit, 'time'];
  }
}

export function describeSet(ex: Exercise, v: SetValues, s: Settings) {
  const w = v.weight != null ? `${num(toDisplayWeight(v.weight, s))}` : '';
  switch (ex.kind) {
    case 'weight_reps':
      return v.weight != null || v.reps != null ? `${w || '0'} ${s.unit} × ${v.reps ?? 0}` : '';
    case 'weighted_bw':
      return v.reps != null ? `${w ? `+${w} ${s.unit} × ` : ''}${v.reps}` : '';
    case 'assisted_bw':
      return v.reps != null ? `${w ? `−${w} ${s.unit} × ` : ''}${v.reps}` : '';
    case 'bodyweight':
      return v.reps != null ? `${v.reps} reps` : '';
    case 'duration':
      return v.duration ? fmtClock(v.duration) : '';
    case 'distance_time':
      return v.distance || v.duration ? `${num(toDisplayDistance(v.distance ?? 0, s), 2)} ${s.distanceUnit} · ${fmtClock(v.duration ?? 0)}` : '';
  }
}

export function SetBadge({ type, index, onCycle, onLongPress, done }: { type: SetType; index: number; onCycle: () => void; onLongPress?: () => void; done?: boolean }) {
  const st = SET_TYPE_STYLE[type];
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onCycle();
      }}
      onLongPress={() => {
        if (onLongPress) haptic.remove();
        onLongPress?.();
      }}
      style={[styles.badge, type !== 'normal' && { backgroundColor: `${st.color}22` }]}
      accessibilityRole="button"
      accessibilityLabel={`Set ${index}, ${type}. Tap to change type${onLongPress ? ', long press to delete' : ''}`}
      hitSlop={6}
    >
      <Text style={[styles.badgeText, { color: type === 'normal' ? (done ? BASE.text : BASE.textMuted) : st.color }]}>{type === 'normal' ? index : st.label}</Text>
    </Pressable>
  );
}

function TimeField({ value, onChange, done, label }: { value?: number; onChange: (v?: number) => void; done?: boolean; label: string }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value ? fmtClock(value) : '');
  return (
    <TextInput
      value={shown}
      onFocus={() => setText(value ? fmtClock(value) : '')}
      onChangeText={setText}
      onEndEditing={() => {
        const raw = text ?? '';
        setText(null);
        const parts = raw.split(':').map((p) => parseInt(p, 10));
        if (!raw || parts.some((p) => Number.isNaN(p))) return onChange(undefined);
        const sec = parts.reduce((acc, p) => acc * 60 + p, 0);
        onChange(sec || undefined);
      }}
      keyboardType="numbers-and-punctuation"
      placeholder="0:00"
      placeholderTextColor={BASE.textFaint}
      selectTextOnFocus
      style={[styles.time, done && { backgroundColor: 'transparent' }]}
      accessibilityLabel={label}
    />
  );
}

export function InlineTimer({ onStop }: { onStop: (sec: number) => void }) {
  const { colors } = useTheme();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useNow(startedAt ? 250 : 0);
  return (
    <Pressable
      onPress={() => {
        haptic.timer();
        if (startedAt) {
          onStop(Math.round((Date.now() - startedAt) / 1000));
          setStartedAt(null);
        } else setStartedAt(Date.now());
      }}
      style={[styles.timerBtn, startedAt != null && { backgroundColor: colors.primary }]}
      accessibilityLabel={startedAt ? 'Stop timer' : 'Start timer'}
    >
      {startedAt ? <Text style={{ color: colors.onPrimary, fontSize: 11, fontWeight: '700' }}>{fmtClock(Math.max(0, now - startedAt) / 1000)}</Text> : <Icon source="play" size={16} color={BASE.textMuted} />}
    </Pressable>
  );
}

export function SetFields({ ex, v, onChange, settings, done, compact }: { ex: Exercise; v: SetValues; onChange: (patch: SetValues) => void; settings: Settings; done?: boolean; compact?: boolean }) {
  const w = compact ? 56 : 64;
  const weightField = (label: string) => (
    <NumField
      width={w + 6}
      value={v.weight != null ? round(toDisplayWeight(v.weight, settings), 0.01) : undefined}
      onChange={(x) => onChange({ weight: x == null ? undefined : fromDisplayWeight(x, settings) })}
      placeholder="0"
      done={done}
      accessibilityLabel={label}
    />
  );
  const repsField = <NumField width={w} integer value={v.reps} onChange={(x) => onChange({ reps: x })} placeholder="0" done={done} accessibilityLabel="Reps" />;

  switch (ex.kind) {
    case 'weight_reps':
      return (
        <>
          {weightField(`Weight in ${settings.unit}`)}
          {repsField}
        </>
      );
    case 'weighted_bw':
      return (
        <>
          {weightField(`Added weight in ${settings.unit}`)}
          {repsField}
        </>
      );
    case 'assisted_bw':
      return (
        <>
          {weightField(`Assistance in ${settings.unit}`)}
          {repsField}
        </>
      );
    case 'bodyweight':
      return repsField;
    case 'duration':
      return <TimeField value={v.duration} onChange={(x) => onChange({ duration: x })} done={done} label="Duration" />;
    case 'distance_time':
      return (
        <>
          <NumField
            width={w + 6}
            value={v.distance != null ? round(toDisplayDistance(v.distance, settings), 0.01) : undefined}
            onChange={(x) => onChange({ distance: x == null ? undefined : fromDisplayDistance(x, settings) })}
            placeholder="0"
            done={done}
            accessibilityLabel={`Distance in ${settings.distanceUnit}`}
          />
          <TimeField value={v.duration} onChange={(x) => onChange({ duration: x })} done={done} label="Time" />
        </>
      );
  }
}

const styles = StyleSheet.create({
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: BASE.containerHigh },
  badgeText: { fontWeight: '800', fontSize: 14, fontVariant: ['tabular-nums'] },
  time: { width: 76, height: 38, borderRadius: 10, backgroundColor: BASE.containerHigh, color: BASE.text, textAlign: 'center', fontSize: 16, fontWeight: '600', paddingVertical: 0, fontVariant: ['tabular-nums'] },
  timerBtn: { minWidth: 38, height: 38, borderRadius: 10, backgroundColor: BASE.containerHigh, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
