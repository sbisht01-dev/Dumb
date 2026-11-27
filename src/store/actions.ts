import { BUILT_IN_EXERCISES } from '@/data/exercises';
import { startOfDay, uid } from '@/lib/format';
import { getState, setState } from './store';
import type { ActiveWorkout, BodyEntry, Exercise, Routine, RoutineExercise, RoutineSet, Settings, SetType, Workout, WorkoutExercise, WorkoutSet } from './types';

let cache: { custom: Exercise[]; map: Map<string, Exercise> } | null = null;
export function exerciseMap(): Map<string, Exercise> {
  const custom = getState().customExercises;
  if (!cache || cache.custom !== custom) {
    cache = { custom, map: new Map([...BUILT_IN_EXERCISES, ...custom].map((e) => [e.id, e])) };
  }
  return cache.map;
}
export const getExercise = (id: string): Exercise =>
  exerciseMap().get(id) ?? { id, name: 'Deleted exercise', kind: 'weight_reps', primary: 'full_body', secondary: [], equipment: 'other' };
export const allExercises = () => [...exerciseMap().values()];

export const updateSettings = (patch: Partial<Settings>) => setState((s) => ({ settings: { ...s.settings, ...patch } }));

export function saveExercise(ex: Omit<Exercise, 'id'> & { id?: string }) {
  const id = ex.id ?? `c_${uid()}`;
  const full: Exercise = { ...ex, id, custom: true };
  setState((s) => ({
    customExercises: s.customExercises.some((e) => e.id === id) ? s.customExercises.map((e) => (e.id === id ? full : e)) : [...s.customExercises, full],
  }));
  return id;
}
export const deleteExercise = (id: string) => setState((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) }));

export const newRoutineSet = (type: SetType = 'normal', from?: Partial<RoutineSet>): RoutineSet => ({ ...from, type, id: uid() });

export function newRoutineExercise(exerciseId: string): RoutineExercise {
  return { id: uid(), exerciseId, sets: [newRoutineSet(), newRoutineSet(), newRoutineSet()], restSec: getState().settings.defaultRest, note: '' };
}

export function saveRoutine(r: Routine) {
  const now = Date.now();
  const routine = { ...r, updatedAt: now };
  setState((s) => ({ routines: s.routines.some((x) => x.id === r.id) ? s.routines.map((x) => (x.id === r.id ? routine : x)) : [...s.routines, { ...routine, createdAt: now }] }));
}
export const deleteRoutine = (id: string) => setState((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
export function duplicateRoutine(id: string) {
  const r = getState().routines.find((x) => x.id === id);
  if (!r) return;
  const copy: Routine = {
    ...r,
    id: uid(),
    name: `${r.name} (copy)`,
    exercises: r.exercises.map((e) => ({ ...e, id: uid(), sets: e.sets.map((x) => ({ ...x, id: uid() })) })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  setState((s) => ({ routines: [...s.routines, copy] }));
}

export function startWorkout(routineId?: string) {
  const s = getState();
  const routine = s.routines.find((r) => r.id === routineId);
  const exercises: WorkoutExercise[] = (routine?.exercises ?? []).map((re) => ({
    id: uid(),
    exerciseId: re.exerciseId,
    restSec: re.restSec,
    note: re.note,
    supersetId: re.supersetId,
    sets: re.sets.map((rs) => ({ id: uid(), type: rs.type, weight: rs.weight, reps: rs.reps, duration: rs.duration, distance: rs.distance, done: false })),
  }));
  const active: ActiveWorkout = { id: uid(), name: routine?.name ?? defaultWorkoutName(), routineId, note: '', startedAt: Date.now(), exercises };
  setState({ active });
}

function defaultWorkoutName() {
  const h = new Date().getHours();
  return h < 11 ? 'Morning workout' : h < 16 ? 'Afternoon workout' : 'Evening workout';
}

export const updateActive = (fn: (w: ActiveWorkout) => ActiveWorkout) => setState((s) => (s.active ? { active: fn(s.active) } : {}));

export const updateExercise = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
  updateActive((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));

export const updateSet = (exId: string, setId: string, patch: Partial<WorkoutSet>) =>
  updateExercise(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

export function addSet(exId: string) {
  updateExercise(exId, (e) => {
    const last = e.sets[e.sets.length - 1];
    const s: WorkoutSet = { id: uid(), type: 'normal', weight: last?.weight, reps: last?.reps, duration: last?.duration, distance: last?.distance, done: false };
    return { ...e, sets: [...e.sets, s] };
  });
}
export const removeSet = (exId: string, setId: string) => updateExercise(exId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));

export function addExercisesToActive(ids: string[]) {
  const rest = getState().settings.defaultRest;
  updateActive((w) => ({
    ...w,
    exercises: [...w.exercises, ...ids.map((exerciseId) => ({ id: uid(), exerciseId, restSec: rest, note: '', sets: [{ id: uid(), type: 'normal' as SetType, done: false }] }))],
  }));
}

export const removeExercise = (exId: string) => updateActive((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== exId) }));
export const moveExercise = (exId: string, dir: -1 | 1) =>
  updateActive((w) => {
    const i = w.exercises.findIndex((e) => e.id === exId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= w.exercises.length) return w;
    const list = [...w.exercises];
    [list[i], list[j]] = [list[j], list[i]];
    return { ...w, exercises: list };
  });

export function toggleSuperset<T extends { id: string; supersetId?: string }>(list: T[], id: string): T[] {
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) return list;
  const cur = list[i];
  if (cur.supersetId) return list.map((e) => (e.supersetId === cur.supersetId ? { ...e, supersetId: undefined } : e));
  const next = list[i + 1];
  if (!next) return list;
  const sid = next.supersetId ?? uid();
  return list.map((e, k) => (k === i || k === i + 1 || e.supersetId === sid ? { ...e, supersetId: sid } : e));
}

export const startRest = (sec: number) => updateActive((w) => ({ ...w, restEndsAt: Date.now() + sec * 1000, restTotal: sec }));
export const adjustRest = (delta: number) =>
  updateActive((w) => (w.restEndsAt ? { ...w, restEndsAt: Math.max(Date.now(), w.restEndsAt + delta * 1000), restTotal: Math.max(1, (w.restTotal ?? 0) + delta) } : w));
export const skipRest = () => updateActive((w) => ({ ...w, restEndsAt: undefined, restTotal: undefined }));

export const discardWorkout = () => setState({ active: null });

export function finishWorkout(): Workout | null {
  const a = getState().active;
  if (!a) return null;
  const exercises = a.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length);
  const workout: Workout = { id: a.id, name: a.name.trim() || 'Workout', routineId: a.routineId, note: a.note, startedAt: a.startedAt, endedAt: Date.now(), exercises };
  setState((s) => ({ active: null, workouts: [workout, ...s.workouts] }));
  return workout;
}

export const updateWorkout = (w: Workout) => setState((s) => ({ workouts: s.workouts.map((x) => (x.id === w.id ? w : x)).sort((a, b) => b.startedAt - a.startedAt) }));
export const deleteWorkout = (id: string) => setState((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));

export function saveWorkoutAsRoutine(id: string): string | null {
  const w = getState().workouts.find((x) => x.id === id);
  if (!w) return null;
  const r: Routine = {
    id: uid(),
    name: w.name,
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    exercises: w.exercises.map((e) => ({
      id: uid(),
      exerciseId: e.exerciseId,
      restSec: e.restSec,
      note: e.note,
      supersetId: e.supersetId,
      sets: e.sets.map((s) => ({ id: uid(), type: s.type, weight: s.weight, reps: s.reps, duration: s.duration, distance: s.distance })),
    })),
  };
  setState((s) => ({ routines: [...s.routines, r] }));
  return r.id;
}

export function saveBodyEntry(e: Omit<BodyEntry, 'id'> & { id?: string }) {
  const date = startOfDay(e.date);
  setState((s) => {
    // one entry per day: merge into an existing one
    const existing = s.body.find((b) => b.id === e.id || b.date === date);
    const entry: BodyEntry = { id: existing?.id ?? uid(), date, values: e.values };
    const list = existing ? s.body.map((b) => (b.id === existing.id ? entry : b)) : [entry, ...s.body];
    return { body: list.sort((a, b) => b.date - a.date) };
  });
}
export const deleteBodyEntry = (id: string) => setState((s) => ({ body: s.body.filter((b) => b.id !== id) }));
