/** Weights are always stored in kg and distances in km; the UI converts for display. */

export type Muscle =
  | 'chest'
  | 'lats'
  | 'upper_back'
  | 'lower_back'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'adductors'
  | 'abductors'
  | 'neck'
  | 'cardio'
  | 'full_body';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'smith' | 'ez_bar' | 'plate' | 'other';

export type ExerciseKind =
  | 'weight_reps' // 60 kg × 8
  | 'bodyweight' // reps only
  | 'weighted_bw' // + extra kg × reps
  | 'assisted_bw' // − assistance kg × reps
  | 'duration' // seconds
  | 'distance_time'; // km + seconds

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  primary: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  custom?: boolean;
}

export type SetType = 'normal' | 'warmup' | 'failure' | 'drop';

export interface SetValues {
  weight?: number; // kg (extra load for weighted_bw, assistance for assisted_bw)
  reps?: number;
  repsMax?: number; // routines only: rep range upper bound
  duration?: number; // seconds
  distance?: number; // km
}

export interface RoutineSet extends SetValues {
  id: string;
  type: SetType;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  sets: RoutineSet[];
  restSec: number; // 0 = off
  note: string;
  supersetId?: string;
}

export interface Routine {
  id: string;
  name: string;
  note: string;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSet extends SetValues {
  id: string;
  type: SetType;
  rpe?: number;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  restSec: number;
  note: string;
  supersetId?: string;
}

export interface Workout {
  id: string;
  name: string;
  routineId?: string;
  note: string;
  startedAt: number;
  endedAt: number;
  exercises: WorkoutExercise[];
}

export interface ActiveWorkout extends Omit<Workout, 'endedAt'> {
  restEndsAt?: number;
  restTotal?: number;
}

export type MeasureKey =
  | 'weight'
  | 'bodyFat'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'abdomen'
  | 'hips'
  | 'bicepL'
  | 'bicepR'
  | 'forearmL'
  | 'forearmR'
  | 'thighL'
  | 'thighR'
  | 'calfL'
  | 'calfR';

export interface BodyEntry {
  id: string;
  date: number; // start of day
  values: Partial<Record<MeasureKey, number>>; // weight kg, bodyFat %, lengths cm
}

export interface Settings {
  unit: 'kg' | 'lb';
  lengthUnit: 'cm' | 'in';
  distanceUnit: 'km' | 'mi';
  defaultRest: number;
  previousValues: 'any' | 'routine';
  warmupsInStats: boolean;
  keepAwake: boolean;
  rpe: boolean;
  inlineTimer: boolean;
  haptics: boolean;
  livePr: boolean;
  barWeight: number; // kg
  plates: number[]; // kg, available plate sizes
  warmupScheme: { pct: number; reps: number }[];
  weekStartsMonday: boolean;
}
