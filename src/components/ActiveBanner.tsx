import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, Text, useTheme } from 'react-native-paper';
import { useStore } from '@/store/store';
import { fmtClock } from '@/lib/format';
import { useNow } from '@/lib/useNow';

export function ActiveBanner() {
  const active = useStore((s) => s.active);
  const { colors } = useTheme();
  const now = useNow(active ? 1000 : 0);
  if (!active) return null;
  const resting = !!active.restEndsAt && active.restEndsAt > now;
  return (
    <Pressable onPress={() => router.push('/active')} style={[styles.banner, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel="Resume workout">
      <Icon source={resting ? 'timer-sand' : 'lightning-bolt'} size={20} color={colors.onPrimary} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.onPrimary }]}>
          {active.name}
        </Text>
        <Text style={[styles.sub, { color: colors.onPrimary }]}>
          {resting ? `Resting · ${fmtClock((active.restEndsAt! - now) / 1000)}` : `In progress · ${fmtClock((now - active.startedAt) / 1000)}`}
        </Text>
      </View>
      <Text style={[styles.cta, { color: colors.onPrimary }]}>RESUME</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  title: { fontWeight: '700', fontSize: 15 },
  sub: { fontSize: 12, opacity: 0.8, fontVariant: ['tabular-nums'] },
  cta: { fontWeight: '800', fontSize: 12, letterSpacing: 1 },
});
