import { MUSCLE_GROUP } from '@/data/exercises';
import { counts, oneRepMax, setVolume } from '@/lib/calc';
import { DAY, addMonths, startOfMonth, startOfWeek } from '@/lib/format';
import { getExercise } from './actions';
import type { Exercise, Settings, Workout, WorkoutExercise, WorkoutSet } from './types';

export function previousSets(workouts: Workout[], exerciseId: string, settings: Settings, routineId?: string): WorkoutSet[] {
  for (const w of workouts) {
    if (settings.previousValues === 'routine' && routineId && w.routineId !== routineId) continue;
    const e = w.exercises.find((x) => x.exerciseId === exerciseId);
    if (e) return e.sets;
  }
  return [];
}

export function exerciseHistory(workouts: Workout[], exerciseId: string) {
  const out: { workout: Workout; entry: WorkoutExercise }[] = [];
  for (const w of workouts) for (const e of w.exercises) if (e.exerciseId === exerciseId) out.push({ workout: w, entry: e });
  return out;
}

export interface Records {
  heaviest: number;
  e1rm: number;
  bestSetVolume: number;
  bestSessionVolume: number;
  mostReps: number;
  mostSessionReps: number;
  longestDuration: number;
  longestDistance: number;
  repBests: Record<number, number>;
}

export const emptyRecords = (): Records => ({
  heaviest: 0,
  e1rm: 0,
  bestSetVolume: 0,
  bestSessionVolume: 0,
  mostReps: 0,
  mostSessionReps: 0,
  longestDuration: 0,
  longestDistance: 0,
  repBests: {},
});

export function addSetToRecords(r: Records, ex: Exercise, s: WorkoutSet) {
  const w = ex.kind === 'weight_reps' || ex.kind === 'weighted_bw' ? s.weight ?? 0 : 0;
  const reps = s.reps ?? 0;
  if (w > r.heaviest) r.heaviest = w;
  const e = oneRepMax(w, reps);
  if (e > r.e1rm) r.e1rm = e;
  const v = setVolume(ex, s);
  if (v > r.bestSetVolume) r.bestSetVolume = v;
  if (reps > r.mostReps) r.mostReps = reps;
  if ((s.duration ?? 0) > r.longestDuration) r.longestDuration = s.duration ?? 0;
  if ((s.distance ?? 0) > r.longestDistance) r.longestDistance = s.distance ?? 0;
  if (w && reps >= 1 && reps <= 12 && w > (r.repBests[reps] ?? 0)) r.repBests[reps] = w;
}

export function computeRecords(workouts: Workout[], exerciseId: string, settings: Settings, before = Infinity, excludeId?: string): Records {
  const ex = getExercise(exerciseId);
  const r = emptyRecords();
  for (const w of workouts) {
    if (w.id === excludeId || w.startedAt >= before) continue;
    for (const e of w.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      let sv = 0;
      let sr = 0;
      for (const s of e.sets) {
        if (!counts(s, settings)) continue;
        addSetToRecords(r, ex, s);
        sv += setVolume(ex, s);
        sr += s.reps ?? 0;
      }
      if (sv > r.bestSessionVolume) r.bestSessionVolume = sv;
      if (sr > r.mostSessionReps) r.mostSessionReps = sr;
    }
  }
  return r;
}

export type PrKind = 'weight' | 'e1rm' | 'volume' | 'reps' | 'duration' | 'distance';
export const PR_LABEL: Record<PrKind, string> = {
  weight: 'Heaviest weight',
  e1rm: 'Best est. 1RM',
  volume: 'Best set volume',
  reps: 'Most reps',
  duration: 'Longest duration',
  distance: 'Longest distance',
};

export function setPRs(ex: Exercise, s: WorkoutSet, r: Records): PrKind[] {
  if (s.type === 'warmup') return [];
  // The first time you log an exercise sets the baseline — no PR fireworks yet.
  const hasHistory = r.heaviest > 0 || r.mostReps > 0 || r.longestDuration > 0 || r.longestDistance > 0;
  if (!hasHistory) return [];
  const out: PrKind[] = [];
  const w = ex.kind === 'weight_reps' || ex.kind === 'weighted_bw' ? s.weight ?? 0 : 0;
  const reps = s.reps ?? 0;
  if (w > 0 && reps > 0) {
    if (r.heaviest > 0 && w > r.heaviest) out.push('weight');
    if (r.e1rm > 0 && oneRepMax(w, reps) > r.e1rm + 0.01) out.push('e1rm');
    if (r.bestSetVolume > 0 && setVolume(ex, s) > r.bestSetVolume) out.push('volume');
  } else if ((ex.kind === 'bodyweight' || ex.kind === 'assisted_bw') && r.mostReps > 0 && reps > r.mostReps) {
    out.push('reps');
  }
  if (r.longestDuration > 0 && (s.duration ?? 0) > r.longestDuration) out.push('duration');
  if (r.longestDistance > 0 && (s.distance ?? 0) > r.longestDistance) out.push('distance');
  return out;
}

export function workoutPRs(workouts: Workout[], w: Workout, settings: Settings) {
  const prs: { exerciseId: string; kind: PrKind; set: WorkoutSet }[] = [];
  for (const e of w.exercises) {
    const ex = getExercise(e.exerciseId);
    const r = computeRecords(workouts, e.exerciseId, settings, w.startedAt, w.id);
    for (const s of e.sets) {
      if (!counts(s, settings)) continue;
      const kinds = setPRs(ex, s, r);
      kinds.forEach((kind) => prs.push({ exerciseId: e.exerciseId, kind, set: s }));
      addSetToRecords(r, ex, s);
    }
  }
  return prs;
}

export function workoutTotals(w: { exercises: WorkoutExercise[]; startedAt: number; endedAt?: number }, settings: Settings) {
  let volume = 0;
  let sets = 0;
  let reps = 0;
  for (const e of w.exercises) {
    const ex = getExercise(e.exerciseId);
    for (const s of e.sets) {
      if (!counts(s, settings)) continue;
      sets++;
      reps += s.reps ?? 0;
      volume += setVolume(ex, s);
    }
  }
  return { volume, sets, reps, duration: ((w.endedAt ?? Date.now()) - w.startedAt) / 1000 };
}

export type ExerciseMetric = 'heaviest' | 'e1rm' | 'volume' | 'reps' | 'duration' | 'distance';

export function exerciseSeries(workouts: Workout[], exerciseId: string, metric: ExerciseMetric, since: number, settings: Settings) {
  const ex = getExercise(exerciseId);
  const pts: { t: number; v: number }[] = [];
  for (const { workout, entry } of exerciseHistory(workouts, exerciseId)) {
    if (workout.startedAt < since) continue;
    let v = 0;
    for (const s of entry.sets) {
      if (!counts(s, settings)) continue;
      const w = s.weight ?? 0;
      if (metric === 'heaviest') v = Math.max(v, w);
      else if (metric === 'e1rm') v = Math.max(v, oneRepMax(w, s.reps ?? 0));
      else if (metric === 'volume') v += setVolume(ex, s);
      else if (metric === 'reps') v += s.reps ?? 0;
      else if (metric === 'duration') v = Math.max(v, s.duration ?? 0);
      else if (metric === 'distance') v = Math.max(v, s.distance ?? 0);
    }
    if (v > 0) pts.push({ t: workout.startedAt, v });
  }
  return pts.reverse();
}

export function weeklyBuckets(workouts: Workout[], weeks: number, settings: Settings) {
  const now = startOfWeek(Date.now(), settings.weekStartsMonday);
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: now - (weeks - 1 - i) * 7 * DAY, workouts: 0, duration: 0, volume: 0, reps: 0, sets: 0 }));
  const first = buckets[0].start;
  for (const w of workouts) {
    if (w.startedAt < first) break;
    const idx = Math.floor((startOfWeek(w.startedAt, settings.weekStartsMonday) - first) / (7 * DAY));
    const b = buckets[idx];
    if (!b) continue;
    const t = workoutTotals(w, settings);
    b.workouts++;
    b.duration += t.duration;
    b.volume += t.volume;
    b.reps += t.reps;
    b.sets += t.sets;
  }
  return buckets;
}

export function muscleSets(workouts: Workout[], since: number, until = Infinity, settings: Settings) {
  const map = new Map<string, number>();
  for (const w of workouts) {
    if (w.startedAt < since || w.startedAt >= until) continue;
    for (const e of w.exercises) {
      const ex = getExercise(e.exerciseId);
      const n = e.sets.filter((s) => counts(s, settings)).length;
      if (!n) continue;
      map.set(MUSCLE_GROUP[ex.primary], (map.get(MUSCLE_GROUP[ex.primary]) ?? 0) + n);
      const seen = new Set([MUSCLE_GROUP[ex.primary]]);
      for (const m of ex.secondary) {
        const g = MUSCLE_GROUP[m];
        if (seen.has(g)) continue;
        seen.add(g);
        map.set(g, (map.get(g) ?? 0) + n * 0.5);
      }
    }
  }
  return [...map.entries()].map(([group, sets]) => ({ group, sets })).sort((a, b) => b.sets - a.sets);
}

export function topExercises(workouts: Workout[], since: number, until = Infinity, limit = 5) {
  const map = new Map<string, number>();
  for (const w of workouts) {
    if (w.startedAt < since || w.startedAt >= until) continue;
    for (const e of w.exercises) map.set(e.exerciseId, (map.get(e.exerciseId) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([id, n]) => ({ id, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

export function weekStreak(workouts: Workout[], mondayFirst: boolean) {
  const weeks = new Set(workouts.map((w) => startOfWeek(w.startedAt, mondayFirst)));
  let cur = startOfWeek(Date.now(), mondayFirst);
  if (!weeks.has(cur)) cur -= 7 * DAY; // this week isn't over yet
  let n = 0;
  while (weeks.has(cur)) {
    n++;
    cur -= 7 * DAY;
  }
  return n;
}

export function monthReport(workouts: Workout[], monthStart: number, settings: Settings) {
  const end = addMonths(monthStart, 1);
  const prevStart = addMonths(monthStart, -1);
  const inMonth = workouts.filter((w) => w.startedAt >= monthStart && w.startedAt < end);
  const inPrev = workouts.filter((w) => w.startedAt >= prevStart && w.startedAt < monthStart);
  const sum = (list: Workout[]) =>
    list.reduce(
      (a, w) => {
        const t = workoutTotals(w, settings);
        return { workouts: a.workouts + 1, duration: a.duration + t.duration, volume: a.volume + t.volume, sets: a.sets + t.sets };
      },
      { workouts: 0, duration: 0, volume: 0, sets: 0 },
    );
  const days = new Set(inMonth.map((w) => new Date(w.startedAt).getDate()));
  const prs = inMonth.flatMap((w) => workoutPRs(workouts, w, settings).map((p) => ({ ...p, workoutId: w.id, at: w.startedAt })));
  return {
    start: monthStart,
    totals: sum(inMonth),
    previous: sum(inPrev),
    days,
    prs,
    muscles: muscleSets(workouts, monthStart, end, settings),
    prevMuscles: muscleSets(workouts, prevStart, monthStart, settings),
    top: topExercises(workouts, monthStart, end, 5),
  };
}

export function monthsWithWorkouts(workouts: Workout[]) {
  return [...new Set(workouts.map((w) => startOfMonth(w.startedAt)))].sort((a, b) => b - a);
}
