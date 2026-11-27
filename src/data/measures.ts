import type { MeasureKey, Settings } from '@/store/types';
import { fromDisplayLength, fromDisplayWeight, num, toDisplayLength, toDisplayWeight } from '@/lib/format';

export const MEASURES: { key: MeasureKey; label: string; kind: 'weight' | 'percent' | 'length' }[] = [
  { key: 'weight', label: 'Body weight', kind: 'weight' },
  { key: 'bodyFat', label: 'Body fat', kind: 'percent' },
  { key: 'neck', label: 'Neck', kind: 'length' },
  { key: 'shoulders', label: 'Shoulders', kind: 'length' },
  { key: 'chest', label: 'Chest', kind: 'length' },
  { key: 'waist', label: 'Waist', kind: 'length' },
  { key: 'abdomen', label: 'Abdomen', kind: 'length' },
  { key: 'hips', label: 'Hips', kind: 'length' },
  { key: 'bicepL', label: 'Left bicep', kind: 'length' },
  { key: 'bicepR', label: 'Right bicep', kind: 'length' },
  { key: 'forearmL', label: 'Left forearm', kind: 'length' },
  { key: 'forearmR', label: 'Right forearm', kind: 'length' },
  { key: 'thighL', label: 'Left thigh', kind: 'length' },
  { key: 'thighR', label: 'Right thigh', kind: 'length' },
  { key: 'calfL', label: 'Left calf', kind: 'length' },
  { key: 'calfR', label: 'Right calf', kind: 'length' },
];

export const measureMeta = (k: MeasureKey) => MEASURES.find((m) => m.key === k)!;

export const RADIAL_ORDER: { key: MeasureKey; short: string }[] = [
  { key: 'weight', short: 'Weight' },
  { key: 'bodyFat', short: 'Body fat' },
  { key: 'waist', short: 'Waist' },
  { key: 'chest', short: 'Chest' },
  { key: 'neck', short: 'Neck' },
  { key: 'shoulders', short: 'Shoulders' },
  { key: 'abdomen', short: 'Abdomen' },
  { key: 'hips', short: 'Hips' },
  { key: 'bicepL', short: 'Bicep L' },
  { key: 'bicepR', short: 'Bicep R' },
  { key: 'forearmL', short: 'Forearm L' },
  { key: 'forearmR', short: 'Forearm R' },
  { key: 'thighL', short: 'Thigh L' },
  { key: 'thighR', short: 'Thigh R' },
  { key: 'calfL', short: 'Calf L' },
  { key: 'calfR', short: 'Calf R' },
];

export const measureUnit = (k: MeasureKey, s: Settings) => {
  const kind = measureMeta(k).kind;
  return kind === 'weight' ? s.unit : kind === 'percent' ? '%' : s.lengthUnit;
};

export const toDisplayMeasure = (k: MeasureKey, v: number, s: Settings) => {
  const kind = measureMeta(k).kind;
  return kind === 'weight' ? toDisplayWeight(v, s) : kind === 'length' ? toDisplayLength(v, s) : v;
};

export const fromDisplayMeasure = (k: MeasureKey, v: number, s: Settings) => {
  const kind = measureMeta(k).kind;
  return kind === 'weight' ? fromDisplayWeight(v, s) : kind === 'length' ? fromDisplayLength(v, s) : v;
};

export const fmtMeasure = (k: MeasureKey, v: number | undefined, s: Settings) => (v == null ? '—' : `${num(toDisplayMeasure(k, v, s))} ${measureUnit(k, s)}`);
