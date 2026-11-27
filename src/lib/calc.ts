import type { Exercise, Settings, SetValues, WorkoutSet } from '@/store/types';

/** Epley estimate; a true single counts as itself. Capped at 12 reps where estimates get unreliable. */
export const oneRepMax = (weight: number, reps: number) => {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
};

export const setLoad = (ex: Exercise, s: SetValues) => {
  switch (ex.kind) {
    case 'weight_reps':
    case 'weighted_bw':
      return s.weight ?? 0;
    default:
      return 0;
  }
};

export const setVolume = (ex: Exercise, s: SetValues) => setLoad(ex, s) * (s.reps ?? 0);

export const counts = (s: WorkoutSet, settings: Settings) => s.done && (settings.warmupsInStats || s.type !== 'warmup');

export function plateBreakdown(target: number, bar: number, plates: number[]) {
  let perSide = (target - bar) / 2;
  const result: { plate: number; count: number }[] = [];
  if (perSide <= 0) return { result, remainder: Math.max(0, target - bar) === 0 ? 0 : target - bar };
  const sorted = [...plates].sort((a, b) => b - a);
  for (const p of sorted) {
    const c = Math.floor((perSide + 1e-6) / p);
    if (c > 0) {
      result.push({ plate: p, count: c });
      perSide -= c * p;
    }
  }
  return { result, remainder: Math.round(perSide * 2 * 100) / 100 };
}

export const roundToPlates = (kg: number, bar: number, plates: number[]) => {
  const smallest = Math.min(...plates) * 2;
  if (kg <= bar) return bar;
  return bar + Math.round((kg - bar) / smallest) * smallest;
};

export const warmupSets = (working: number, settings: Settings) =>
  settings.warmupScheme
    .map((step) => ({ weight: roundToPlates(working * step.pct, settings.barWeight, settings.plates), reps: step.reps }))
    .filter((s, i, arr) => s.weight > 0 && s.weight < working && (i === 0 || s.weight !== arr[i - 1].weight));
