import { Platform, Vibration } from 'react-native';
import { AndroidHaptics as H, performAndroidHapticsAsync } from 'expo-haptics';
import { getState } from '@/store/store';

const API = Platform.OS === 'android' ? Number(Platform.Version) : 0;
const pick = (api34: H, api30: H, any: H) => (API >= 34 ? api34 : API >= 30 ? api30 : any);

const TICK = pick(H.Segment_Tick, H.Clock_Tick, H.Clock_Tick);
const CLICK = H.Context_Click;
const PRESS = pick(H.Gesture_Start, H.Long_Press, H.Long_Press);
const CONFIRM = pick(H.Confirm, H.Confirm, H.Virtual_Key);
const REJECT = pick(H.Reject, H.Reject, H.Long_Press);
const ON = pick(H.Toggle_On, H.Confirm, H.Virtual_Key);
const OFF = pick(H.Toggle_Off, H.Clock_Tick, H.Clock_Tick);
const KEY = H.Keyboard_Tap;

type Beat = [number, H];

const BEATS = {
  select: [[0, TICK]],
  open: [[0, PRESS]],
  choose: [[0, TICK], [70, CLICK]],
  complete: [[0, ON]],
  undo: [[0, OFF]],
  timer: [[0, KEY]],
  remove: [[0, REJECT]],
  save: [[0, CLICK], [110, CONFIRM]],
  start: [[0, PRESS], [140, CONFIRM]],
  pr: [[0, TICK], [80, TICK], [160, TICK], [280, CONFIRM]],
  rest: [],
} satisfies Record<string, Beat[]>;

export type HapticKind = keyof typeof BEATS;

const REST_PATTERN = [0, 160, 120, 160];

let timers: ReturnType<typeof setTimeout>[] = [];

function play(effect: H) {
  performAndroidHapticsAsync(effect).catch(() => Vibration.vibrate(8));
}

function fire(kind: HapticKind) {
  if (!getState().settings.haptics || Platform.OS !== 'android') return;
  timers.forEach(clearTimeout);
  timers = [];
  if (kind === 'rest') {
    Vibration.vibrate(REST_PATTERN);
    return;
  }
  for (const [at, effect] of BEATS[kind] as Beat[]) {
    if (at === 0) play(effect);
    else timers.push(setTimeout(() => play(effect), at));
  }
}

export const haptic = Object.fromEntries((Object.keys(BEATS) as HapticKind[]).map((k) => [k, () => fire(k)])) as Record<HapticKind, () => void>;
