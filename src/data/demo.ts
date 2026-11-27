import { DAY, startOfDay, uid } from '@/lib/format';
import { setState } from '@/store/store';
import type { BodyEntry, Routine, Workout, WorkoutExercise } from '@/store/types';

const PLAN: { name: string; items: [string, number, number, number][] }[] = [
  // exerciseId, start kg, weekly +kg, reps
  { name: 'Push', items: [['bench_bb', 60, 1.25, 6], ['incline_db', 20, 0.5, 10], ['ohp_bb', 35, 0.75, 8], ['lat_raise_db', 8, 0.25, 15], ['tri_rope', 20, 0.5, 12]] },
  { name: 'Pull', items: [['deadlift_bb', 100, 2.5, 5], ['lat_pulldown', 50, 1.25, 10], ['row_cable', 45, 1, 10], ['face_pull', 15, 0.5, 15], ['curl_db', 10, 0.25, 12]] },
  { name: 'Legs', items: [['squat_bb', 80, 2.5, 6], ['rdl_bb', 70, 1.25, 8], ['leg_press', 120, 5, 10], ['leg_curl', 35, 1, 12], ['calf_standing', 50, 1.25, 15]] },
];

export function loadDemoData() {
  const weeks = 14;
  const today = startOfDay();
  const workouts: Workout[] = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  for (let wk = weeks - 1; wk >= 0; wk--) {
    PLAN.forEach((day, di) => {
      if (rand() < 0.08) return; // the occasional missed session
      const start = today - (wk * 7 + (6 - di * 2)) * DAY + (17 + Math.floor(rand() * 3)) * 3600_000;
      if (start > Date.now()) return;
      const prog = weeks - 1 - wk;
      const exercises: WorkoutExercise[] = day.items.map(([exerciseId, base, inc, reps]) => {
        const top = Math.round((base + inc * prog) / 1.25) * 1.25;
        const warm = exerciseId.endsWith('_bb') ? [{ id: uid(), type: 'warmup' as const, weight: Math.round(top * 0.5 / 2.5) * 2.5, reps: 8, done: true }] : [];
        return {
          id: uid(),
          exerciseId,
          restSec: 120,
          note: '',
          sets: [...warm, ...[0, 1, 2].map((i) => ({ id: uid(), type: 'normal' as const, weight: top, reps: Math.max(1, reps - (i === 2 && rand() < 0.4 ? 1 : 0)), done: true }))],
        };
      });
      workouts.push({ id: uid(), name: `${day.name} day`, routineId: `demo_${day.name.toLowerCase()}`, note: '', startedAt: start, endedAt: start + (50 + Math.floor(rand() * 25)) * 60_000, exercises });
    });
  }
  workouts.sort((a, b) => b.startedAt - a.startedAt);

  const routines: Routine[] = PLAN.map((day) => ({
    id: `demo_${day.name.toLowerCase()}`,
    name: `${day.name} day`,
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    exercises: day.items.map(([exerciseId, base, , reps]) => ({
      id: uid(),
      exerciseId,
      restSec: 120,
      note: '',
      sets: [0, 1, 2].map(() => ({ id: uid(), type: 'normal' as const, weight: base, reps })),
    })),
  }));

  const body: BodyEntry[] = Array.from({ length: weeks }, (_, i) => ({
    id: uid(),
    date: today - i * 7 * DAY,
    values: { weight: 82 - (weeks - 1 - i) * 0.25 + (i % 3) * 0.1, bodyFat: 19 - (weeks - 1 - i) * 0.15, waist: 86 - (weeks - 1 - i) * 0.2, chest: 102 + (weeks - 1 - i) * 0.1 },
  }));

  setState((s) => ({
    workouts: [...workouts, ...s.workouts].sort((a, b) => b.startedAt - a.startedAt),
    routines: [...s.routines.filter((r) => !r.id.startsWith('demo_')), ...routines],
    body: [...body, ...s.body].sort((a, b) => b.date - a.date),
  }));
}
