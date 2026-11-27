import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { ActiveWorkout, BodyEntry, Exercise, Routine, Settings, Workout } from './types';

export interface State {
  customExercises: Exercise[];
  routines: Routine[];
  workouts: Workout[]; // newest first
  active: ActiveWorkout | null;
  body: BodyEntry[]; // newest first
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  lengthUnit: 'cm',
  distanceUnit: 'km',
  defaultRest: 90,
  previousValues: 'any',
  warmupsInStats: false,
  keepAwake: true,
  rpe: false,
  inlineTimer: true,
  haptics: true,
  livePr: true,
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  warmupScheme: [
    { pct: 0.4, reps: 10 },
    { pct: 0.6, reps: 5 },
    { pct: 0.8, reps: 3 },
  ],
  weekStartsMonday: true,
};

const KEYS: (keyof State)[] = ['customExercises', 'routines', 'workouts', 'active', 'body', 'settings'];
const PREFIX = 'dumb.v1.';

const DEFAULTS: State = {
  customExercises: [],
  routines: [],
  workouts: [],
  active: null,
  body: [],
  settings: DEFAULT_SETTINGS,
};

function load(): State {
  const s = { ...DEFAULTS } as State;
  for (const k of KEYS) {
    try {
      const raw = Storage.getItemSync(PREFIX + k);
      if (raw != null) (s as unknown as Record<string, unknown>)[k] = JSON.parse(raw);
    } catch {
      /* corrupt slice → keep default */
    }
  }
  s.settings = { ...DEFAULT_SETTINGS, ...s.settings };
  return s;
}

let state: State = load();
const listeners = new Set<() => void>();
const timers: Partial<Record<keyof State, ReturnType<typeof setTimeout>>> = {};

function persist(key: keyof State) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    Storage.setItem(PREFIX + key, JSON.stringify(state[key])).catch(() => {});
  }, 300);
}

export function getState() {
  return state;
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  (Object.keys(p) as (keyof State)[]).forEach(persist);
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function flush() {
  KEYS.forEach((k) => {
    clearTimeout(timers[k]);
    Storage.setItemSync(PREFIX + k, JSON.stringify(state[k]));
  });
}

export function resetAll() {
  state = { ...DEFAULTS, settings: state.settings };
  flush();
  listeners.forEach((l) => l());
}
