import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BASE } from '@/theme';
import { RANGES, type Range } from '@/lib/range';
import { haptic } from '@/lib/haptics';
import { SPRING, enterUp } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type IconName = ComponentProps<typeof Icon>['source'];

export function Page({ children, padded = true, contentStyle }: { children: ReactNode; padded?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: BASE.background }} contentContainerStyle={[padded && styles.page, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
  onLongPress,
  index,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  index?: number;
}) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const entering = index != null ? enterUp(index) : undefined;
  if (!onPress && !onLongPress)
    return (
      <Animated.View entering={entering} style={[styles.card, style]}>
        {children}
      </Animated.View>
    );
  return (
    <AnimatedPressable
      entering={entering}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
      style={[styles.card, style, pressStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="labelLarge" style={styles.sectionText}>
        {children}
      </Text>
      {action}
    </View>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="labelSmall" style={styles.statLabel}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.statValue, accent && { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryContainer }]}>
        <Icon source={icon} size={30} color={colors.onPrimaryContainer} />
      </View>
      <Text variant="titleMedium" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {body ? (
        <Text variant="bodyMedium" style={{ color: BASE.textMuted, textAlign: 'center' }}>
          {body}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const { colors } = useTheme();
  const [boxes, setBoxes] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const box = boxes[value];
  useEffect(() => {
    if (!box) return;
    const first = w.value === 0;
    x.value = first ? box.x : withSpring(box.x, SPRING);
    w.value = first ? box.w : withSpring(box.w, SPRING);
  }, [box, x, w]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value, opacity: w.value ? 1 : 0 }));
  return (
    <View style={styles.range}>
      <Animated.View style={[styles.rangePill, { backgroundColor: colors.primary }, pill]} />
      {RANGES.map((r) => {
        const on = value === r.id;
        return (
          <Pressable
            key={r.id}
            onLayout={(e) => {
              const { x: bx, width } = e.nativeEvent.layout;
              setBoxes((b) => (b[r.id]?.x === bx && b[r.id]?.w === width ? b : { ...b, [r.id]: { x: bx, w: width } }));
            }}
            onPress={() => {
              haptic.select();
              onChange(r.id);
            }}
            style={styles.rangeItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={r.label}
          >
            <Text style={[styles.rangeText, on && { color: colors.onPrimary }]}>{r.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NumField({
  value,
  onChange,
  placeholder,
  width = 64,
  done,
  integer,
  accessibilityLabel,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  width?: number;
  done?: boolean;
  integer?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <TextInput
      value={value == null ? '' : String(value)}
      onChangeText={(t) => {
        const n = parseFloat(t.replace(',', '.'));
        onChange(t === '' || !Number.isFinite(n) ? undefined : integer ? Math.round(n) : n);
      }}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      placeholder={placeholder}
      placeholderTextColor={BASE.textFaint}
      selectTextOnFocus
      style={[styles.num, { width }, done && styles.numDone]}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 120, gap: 12 },
  card: { backgroundColor: BASE.container, borderRadius: 20, padding: 16, overflow: 'hidden' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 2, paddingHorizontal: 4 },
  sectionText: { color: BASE.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: BASE.container, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14, gap: 2 },
  statLabel: { color: BASE.textFaint, letterSpacing: 0.8 },
  statValue: { fontSize: 26, fontWeight: '700', color: BASE.text, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  range: { flexDirection: 'row', backgroundColor: BASE.containerHigh, borderRadius: 999, padding: 4, alignSelf: 'flex-start' },
  rangeItem: { paddingHorizontal: 16, height: 30, borderRadius: 999, justifyContent: 'center' },
  rangePill: { position: 'absolute', left: 0, top: 4, height: 30, borderRadius: 999 },
  rangeText: { fontSize: 13, fontWeight: '600', color: BASE.textMuted },
  num: {
    height: 38,
    borderRadius: 10,
    backgroundColor: BASE.containerHigh,
    color: BASE.text,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  numDone: { backgroundColor: 'transparent' },
});
