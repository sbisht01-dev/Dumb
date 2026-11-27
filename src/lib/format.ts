import type { Settings } from '@/store/types';

/** Deep copy for plain JSON data (Hermes doesn't guarantee structuredClone). */
export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const KG_PER_LB = 0.45359237;
const KM_PER_MI = 1.609344;
const CM_PER_IN = 2.54;

export const toDisplayWeight = (kg: number, s: Settings) => (s.unit === 'kg' ? kg : kg / KG_PER_LB);
export const fromDisplayWeight = (v: number, s: Settings) => (s.unit === 'kg' ? v : v * KG_PER_LB);
export const toDisplayDistance = (km: number, s: Settings) => (s.distanceUnit === 'km' ? km : km / KM_PER_MI);
export const fromDisplayDistance = (v: number, s: Settings) => (s.distanceUnit === 'km' ? v : v * KM_PER_MI);
export const toDisplayLength = (cm: number, s: Settings) => (s.lengthUnit === 'cm' ? cm : cm / CM_PER_IN);
export const fromDisplayLength = (v: number, s: Settings) => (s.lengthUnit === 'cm' ? v : v * CM_PER_IN);

export const round = (n: number, step = 0.1) => Math.round(n / step) * step;

export const num = (n: number | undefined, digits = 1) => {
  if (n == null || Number.isNaN(n)) return '';
  const r = Number(n.toFixed(digits));
  return String(r);
};

export const fmtWeight = (kg: number | undefined, s: Settings, withUnit = true) =>
  kg == null ? '—' : `${num(toDisplayWeight(kg, s))}${withUnit ? ` ${s.unit}` : ''}`;

export const fmtVolume = (kg: number, s: Settings) => {
  const v = toDisplayWeight(kg, s);
  if (v >= 100000) return `${Math.round(v / 1000)}k ${s.unit}`;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k ${s.unit}`;
  return `${Math.round(v).toLocaleString()} ${s.unit}`;
};

export const fmtDistance = (km: number | undefined, s: Settings) => (km == null ? '—' : `${num(toDisplayDistance(km, s), 2)} ${s.distanceUnit}`);

export const fmtClock = (sec: number) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export const fmtDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};

export const DAY = 86_400_000;
export const startOfDay = (t: number | Date = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const startOfWeek = (t: number, mondayFirst: boolean) => {
  const d = new Date(startOfDay(t));
  const dow = d.getDay(); // 0 = Sun
  const diff = mondayFirst ? (dow + 6) % 7 : dow;
  d.setDate(d.getDate() - diff);
  return d.getTime();
};
export const startOfMonth = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};
export const addMonths = (t: number, n: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
};

export const fmtDate = (t: number, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(t).toLocaleDateString(undefined, opts);
export const fmtDateLong = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtMonth = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const relDay = (t: number) => {
  const d = Math.round((startOfDay() - startOfDay(t)) / DAY);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return new Date(t).toLocaleDateString(undefined, { weekday: 'long' });
  return fmtDate(t, { day: 'numeric', month: 'short', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

export const parseNum = (text: string) => {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};
