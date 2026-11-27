import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { BASE } from '@/theme';
import { fmtDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const H = 160;
const PAD = { l: 8, r: 8, t: 14, b: 8 };

export function LineChart({ points, format, height = H }: { points: { t: number; v: number }[]; format: (v: number) => string; height?: number }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  if (points.length === 0)
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="bodySmall" style={{ color: BASE.textFaint }}>
          No data in this range yet
        </Text>
      </View>
    );

  const vs = points.map((p) => p.v);
  let min = Math.min(...vs);
  let max = Math.max(...vs);
  if (min === max) {
    min = min * 0.9;
    max = max * 1.1 || 1;
  }
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const iw = Math.max(1, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const x = (t: number) => PAD.l + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw);
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${x(t1).toFixed(1)},${PAD.t + ih} L${x(t0).toFixed(1)},${PAD.t + ih} Z`;
  const active = sel ?? points.length - 1;
  const ap = points[active];

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutValue}>{format(ap.v)}</Text>
        <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
          {fmtDate(ap.t, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View
        style={{ height }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        accessibilityLabel={`Chart with ${points.length} points, latest ${format(points[points.length - 1].v)}`}
      >
        {w > 0 && (
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.28} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0, 0.5, 1].map((f) => (
              <Line key={f} x1={PAD.l} x2={w - PAD.r} y1={PAD.t + ih * f} y2={PAD.t + ih * f} stroke={BASE.outlineVariant} strokeWidth={1} />
            ))}
            <Path d={area} fill="url(#fill)" />
            <Path d={d} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {points.length <= 40 && points.map((p, i) => <Circle key={i} cx={x(p.t)} cy={y(p.v)} r={i === active ? 5 : 3} fill={i === active ? colors.primary : BASE.background} stroke={colors.primary} strokeWidth={2} />)}
            {points.length > 40 && <Circle cx={x(ap.t)} cy={y(ap.v)} r={5} fill={colors.primary} stroke={BASE.background} strokeWidth={2} />}
            <Line x1={x(ap.t)} x2={x(ap.t)} y1={PAD.t} y2={PAD.t + ih} stroke={colors.primary} strokeOpacity={0.35} strokeDasharray="3 4" />
          </Svg>
        )}
      </View>
      <View style={styles.axis}>
        <Text variant="labelSmall" style={styles.axisText}>
          {fmtDate(t0)}
        </Text>
        <Text variant="labelSmall" style={styles.axisText}>
          {fmtDate(t1)}
        </Text>
      </View>
    </View>
  );

  function pick(px: number) {
    let best = 0;
    let dist = Infinity;
    points.forEach((p, i) => {
      const dd = Math.abs(x(p.t) - px);
      if (dd < dist) {
        dist = dd;
        best = i;
      }
    });
    setSel(best);
  }
}

export function BarChart({ data, format, labelFor, height = 140 }: { data: { key: number; v: number }[]; format: (v: number) => string; labelFor: (key: number, i: number) => string; height?: number }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.v));
  const n = data.length;
  const gap = 4;
  const bw = n ? (w - gap * (n - 1)) / n : 0;
  const active = sel ?? n - 1;
  const total = data.reduce((a, d) => a + d.v, 0);

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutValue}>{format(data[active]?.v ?? 0)}</Text>
        <Text variant="bodySmall" style={{ color: BASE.textMuted }}>
          {sel == null ? `this week · avg ${format(total / Math.max(1, n))}` : labelFor(data[active].key, active)}
        </Text>
      </View>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Svg width={w} height={height}>
            {data.map((d, i) => {
              const h = Math.max(d.v > 0 ? 3 : 0, (d.v / max) * (height - 6));
              const x = i * (bw + gap);
              return (
                <Rect
                  key={d.key}
                  x={x}
                  y={height - h}
                  width={bw}
                  height={h}
                  rx={Math.min(4, bw / 2)}
                  fill={colors.primary}
                  opacity={i === active ? 1 : 0.45}
                  onPress={() => setSel(i)}
                />
              );
            })}
            {d0(height)}
          </Svg>
        )}
      </View>
      <View style={styles.axis}>
        <Text variant="labelSmall" style={styles.axisText}>
          {n ? labelFor(data[0].key, 0) : ''}
        </Text>
        <Text variant="labelSmall" style={styles.axisText}>
          {n ? labelFor(data[n - 1].key, n - 1) : ''}
        </Text>
      </View>
    </View>
  );

  function d0(h: number) {
    return <Line x1={0} x2={w} y1={h - 0.5} y2={h - 0.5} stroke={BASE.outline} strokeWidth={1} />;
  }
}

export function HBars({ rows, format, compare }: { rows: { label: string; v: number }[]; format: (v: number) => string; compare?: Record<string, number> }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.v), ...Object.values(compare ?? {}));
  if (!rows.length)
    return (
      <Text variant="bodySmall" style={{ color: BASE.textFaint, paddingVertical: 12 }}>
        No sets logged in this range
      </Text>
    );
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => {
        const prev = compare?.[r.label];
        return (
          <View key={r.label} style={{ gap: 4 }}>
            <View style={styles.hbarHead}>
              <Text variant="bodyMedium">{r.label}</Text>
              <Text variant="bodyMedium" style={styles.hbarValue}>
                {format(r.v)}
                {prev != null ? (
                  <Text style={{ color: r.v >= prev ? BASE.ok : BASE.danger }}>
                    {'  '}
                    {r.v >= prev ? '▲' : '▼'} {format(Math.abs(r.v - prev))}
                  </Text>
                ) : null}
              </Text>
            </View>
            <View style={styles.hbarTrack}>
              <View style={[styles.hbarFill, { width: `${(r.v / max) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function MetricTabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metrics}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable key={it.id} onPress={() => (haptic.select(), onChange(it.id))} style={[styles.metric, on && { borderColor: colors.primary, backgroundColor: colors.primaryContainer }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[styles.metricText, on && { color: colors.onPrimaryContainer }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  readout: { marginBottom: 6 },
  readoutValue: { fontSize: 24, fontWeight: '700', color: BASE.text, fontVariant: ['tabular-nums'] },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { color: BASE.textFaint },
  hbarHead: { flexDirection: 'row', justifyContent: 'space-between' },
  hbarValue: { color: BASE.textMuted, fontVariant: ['tabular-nums'] },
  hbarTrack: { height: 8, borderRadius: 4, backgroundColor: BASE.containerHigh, overflow: 'hidden' },
  hbarFill: { height: 8, borderRadius: 4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metric: { paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: BASE.outline, justifyContent: 'center' },
  metricText: { fontSize: 13, fontWeight: '600', color: BASE.textMuted },
});
