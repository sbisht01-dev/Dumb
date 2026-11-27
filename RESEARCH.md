# Dumb: feature research and spec

This is research on Hevy's **offline training features**, from public sources only:
hevyapp.com feature pages and the Google Play listing. No app code or assets were copied.
Social, community, coach and online features are out of scope, as requested.

## What Hevy does, and what Dumb implements

| Area | Hevy (from research) | Dumb |
|---|---|---|
| **Exercise library** | Hundreds of exercises, filter by muscle and equipment | ~100 seeded exercises, search plus muscle and equipment filters |
| **Custom exercises** | Create your own | Create, edit and delete, with no limit |
| **Exercise types** | Weight & reps, rep range, duration, bodyweight, cardio | Weight & reps, bodyweight reps, weighted bodyweight, assisted bodyweight, duration, distance & time |
| **Routines** | Planner, folders, notes, per-exercise rest, supersets | Notes, rest, supersets, duplicate, reorder and unlimited routines. No folders, by choice: a single list is simpler |
| **Start workout** | From a routine or empty | Both, with a minimisable "workout in progress" bar |
| **Set types** | Normal, warm-up (W), failure (F), drop (D) | Same. Tap the set number to cycle. The rest timer doesn't start before a drop set |
| **Previous values** | Shown inline; "any workout" or "same routine" | Same, configurable in settings |
| **Rest timer** | Automatic, per exercise, default in settings | Automatic, with ±15s and skip, plus haptic and vibration when done |
| **RPE** | Optional column (setting) | Optional column (setting), 6–10 in 0.5 steps |
| **Inline timer** | Stopwatch per set for timed exercises | Start/stop timer on duration sets |
| **Live PR** | Notification when a set beats a record | Snackbar and haptic, listed on the summary |
| **Save workout** | Summary: duration, volume, sets, PRs | Summary screen, editable name and notes |
| **Exercise stats** | Heaviest weight, 1RM, best set volume, session volume, most reps, set records, graph | All of these, with a graph of heaviest weight, est. 1RM, session volume or total reps |
| **Graph ranges** | Free: last 3 months; Pro: 1 year and all time | Every range is free |
| **Statistics** | Sets per muscle group, muscle distribution, main exercises, weekly graphs | Weekly workouts, duration, volume and reps; sets per muscle; distribution; top exercises |
| **Monthly report** | Previous month: totals, comparison, PRs, days, muscles, top exercises | Same, with a free archive of every month |
| **Calendar and streak** | Workout days, weekly streak | Month calendar plus weekly streak |
| **Body measurements** | Weight, body fat, 14 circumferences, graph per metric | Same, picked with a press-and-hold radial dial. Photos left out to keep the app light |
| **Warm-up calculator** | % based warm-up sets with plate rounding | Adds warm-up sets to any weighted exercise |
| **Plate calculator** | Plates per side for barbell | Configurable bar and available plates |
| **Settings** | Units, rest timer, previous values, warm-ups in stats, keep awake, RPE, inline timer, sounds | Same (haptics instead of sounds) |
| **Pro price** | $2.99/month | No subscription: everything is free |

## Design direction (deliberately not Hevy)
- **Dark-first Material 3** using react-native-paper, with a near-black olive base and a **volt (lime) accent**.
  Hevy uses blue on white or black.
- **Large tabular numbers** for weights, times and totals. Every card has 20px corners and tonal surfaces instead of borders.
- **Navigation:** five bottom tabs (Train, History, Progress, Body, More), plus full-screen stacks for focused work.
- **Lightweight:**
  - few native modules: SQLite key-value storage, keep-awake, haptics, SVG, Reanimated, Gesture Handler
  - charts are hand-drawn in SVG
  - no image or photo libraries
  - Hermes, R8 and an arm64-only release build
