import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import { haptic } from '@/lib/haptics';
import { BASE } from '@/theme';
import { EASE_IN, EASE_OUT } from './motion';

const SWEEP_FROM = 100; // degrees, clockwise = towards the right edge
const OPEN = { duration: 300, easing: EASE_OUT };
const CLOSE = { duration: 170, easing: EASE_IN };

export interface RadialItem {
  key: string;
  label: string;
  muted?: boolean;
}

interface Props {
  items: RadialItem[];
  value: string;
  onChange: (key: string) => void;
  icon: string;
  bottom: number;
  right?: number;
  accessibilityLabel: string;
  onHint?: () => void;
}

const BTN = 56;
const C = BTN / 2;
/** Visible arc (degrees, screen space: 0 = right, 90 = down, 180 = left, 270 = up). */
const A0 = 166;
const A1 = 274;
const SPAN = A1 - A0;
const RINGS: [number, number][] = [
  [72, 146],
  [146, 220],
  [220, 294],
];
const PER_RING = [4, 6, 8];
const R = RINGS[RINGS.length - 1][1] + 8;

function layoutRings(n: number) {
  const counts: number[] = [];
  let left = n;
  for (let i = 0; i < RINGS.length && left > 0; i++) {
    const c = Math.min(PER_RING[i], left);
    counts.push(c);
    left -= c;
  }
  if (counts.length > 1 && counts[counts.length - 1] < counts[counts.length - 2] / 2) {
    const total = counts.reduce((a, b) => a + b, 0);
    const per = Math.ceil(total / counts.length);
    let rem = total;
    for (let i = 0; i < counts.length; i++) {
      counts[i] = Math.min(PER_RING[i], per, rem);
      rem -= counts[i];
    }
  }
  return counts;
}

function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const p = (r: number, a: number) => `${(cx + r * Math.cos(rad(a))).toFixed(2)} ${(cy + r * Math.sin(rad(a))).toFixed(2)}`;
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

export function RadialPicker({ items, value, onChange, icon, bottom, right = 16, accessibilityLabel, onHint }: Props) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState(-1);
  const [opened, setOpened] = useState(false);
  const open = useSharedValue(0);
  const hot = useSharedValue(-1);

  const counts = useMemo(() => layoutRings(items.length), [items.length]);
  const offsets = useMemo(() => counts.map((_, i) => counts.slice(0, i).reduce((a, b) => a + b, 0)), [counts]);

  const segs = useMemo(
    () =>
      items.map((item, gi) => {
        let ring = 0;
        for (let k = 0; k < offsets.length; k++) if (gi >= offsets[k]) ring = k;
        const i = gi - offsets[ring];
        const n = counts[ring];
        const step = SPAN / n;
        const a1 = A1 - i * step;
        const a0 = a1 - step;
        const [r0, r1] = RINGS[ring];
        const mid = ((a0 + a1) / 2) * (Math.PI / 180);
        const rm = (r0 + r1) / 2;
        const lw = Math.max(44, Math.min(96, rm * ((step * Math.PI) / 180) - 6));
        return { item, path: sector(R, R, r0 + 2, r1 - 2, a0 + 0.9, a1 - 0.9), lx: R + rm * Math.cos(mid), ly: R + rm * Math.sin(mid), lw };
      }),
    [items, counts, offsets],
  );

  const commit = (idx: number) => {
    if (idx >= 0 && items[idx]) {
      haptic.choose();
      onChange(items[idx].key);
    }
  };
  const onHover = (idx: number) => {
    setHover(idx);
    if (idx >= 0) haptic.select();
  };

  const gesture = useMemo(() => {
    const ringCount = counts.length;
    const countsCopy = [...counts];
    const offsetsCopy = [...offsets];
    const rings = RINGS.slice(0, ringCount);
    const hit = (x: number, y: number) => {
      'worklet';
      const dx = x - C;
      const dy = y - C;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < rings[0][0] - 6 || r > rings[ringCount - 1][1] + 36) return -1;
      let ring = 0;
      for (let k = 0; k < ringCount; k++) if (r >= rings[k][0] - 6) ring = k;
      let a = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (a < 0) a += 360;
      if (a < A0 - 10 || a > A1 + 10) return -1;
      const n = countsCopy[ring];
      const step = SPAN / n;
      let i = Math.floor((A1 - a) / step);
      if (i < 0) i = 0;
      if (i > n - 1) i = n - 1;
      return offsetsCopy[ring] + i;
    };

    const pan = Gesture.Pan()
      .activateAfterLongPress(180)
      .onStart(() => {
        open.value = withTiming(1, OPEN);
        scheduleOnRN(setOpened, true);
        scheduleOnRN(haptic.open);
      })
      .onUpdate((e) => {
        const idx = hit(e.x, e.y);
        if (idx !== hot.value) {
          hot.value = idx;
          scheduleOnRN(onHover, idx);
        }
      })
      .onEnd(() => {
        scheduleOnRN(commit, hot.value);
      })
      .onFinalize(() => {
        open.value = withTiming(0, CLOSE);
        hot.value = -1;
        scheduleOnRN(onHover, -1);
        scheduleOnRN(setOpened, false);
      });
    const tap = Gesture.Tap().onEnd(() => {
      if (onHint) scheduleOnRN(onHint);
    });
    return Gesture.Exclusive(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, offsets, items, onHint]);

  const cx = size.w - right - C;
  const cy = size.h - bottom - C;

  const wheel = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [{ rotate: `${interpolate(open.value, [0, 1], [SWEEP_FROM, 0])}deg` }, { scale: interpolate(open.value, [0, 1], [0.7, 1]) }],
  }));
  const scrim = useAnimatedStyle(() => ({ opacity: open.value * 0.72 }));
  const btn = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(open.value, [0, 1], [1, 1.08]) }] }));

  const current = items.find((i) => i.key === value);
  const hovered = hover >= 0 ? items[hover] : undefined;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, scrim]} />

      {size.w > 0 && (
        <Animated.View pointerEvents="none" style={[styles.wheel, { left: cx - R, top: cy - R, width: 2 * R, height: 2 * R }, wheel]}>
          <Svg width={2 * R} height={2 * R}>
            {segs.map((s, i) => {
              const isHover = i === hover;
              const isCurrent = s.item.key === value;
              return (
                <Path
                  key={s.item.key}
                  d={s.path}
                  fill={isHover ? colors.primary : isCurrent ? colors.primaryContainer : BASE.containerHighest}
                  stroke={isCurrent && !isHover ? colors.primary : 'transparent'}
                  strokeWidth={1.5}
                />
              );
            })}
          </Svg>
          {segs.map((s, i) => (
            <Text
              key={s.item.key}
              numberOfLines={1}
              style={[
                styles.label,
                { left: s.lx - s.lw / 2, top: s.ly - 9, width: s.lw },
                { color: i === hover ? colors.onPrimary : s.item.muted ? BASE.textFaint : BASE.text },
                i === hover && { fontWeight: '800' },
              ]}
            >
              {s.item.label}
            </Text>
          ))}
        </Animated.View>
      )}

      {opened && size.w > 0 && (
        <View pointerEvents="none" style={[styles.readout, { top: Math.max(12, cy - R - 56) }]}>
          <Text style={[styles.readoutText, { color: hovered ? colors.primary : BASE.textMuted }]}>{hovered ? hovered.label : 'Slide to a measurement'}</Text>
        </View>
      )}

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.button, { right, bottom, backgroundColor: colors.secondaryContainer }, btn]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{ text: current?.label }}
          accessibilityHint="Press and hold, then slide to choose. Or use the actions menu."
          accessibilityActions={items.map((i) => ({ name: i.key, label: i.label }))}
          onAccessibilityAction={(e) => onChange(e.nativeEvent.actionName)}
        >
          <Icon source={icon} size={26} color={colors.onSecondaryContainer} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: { position: 'absolute' },
  label: { position: 'absolute', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  button: {
    position: 'absolute',
    width: BTN,
    height: BTN,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  readout: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  readoutText: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
});
