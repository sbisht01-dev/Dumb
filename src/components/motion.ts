import { Easing, FadeIn, FadeInDown, FadeOut, FadeOutDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';

export const EASE_OUT = Easing.out(Easing.cubic);
export const EASE_IN = Easing.in(Easing.cubic);

export const SPRING = { damping: 26, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.System } as const;

export const enterUp = (index = 0) =>
  FadeInDown.delay(Math.min(index, 8) * 30)
    .duration(260)
    .easing(EASE_OUT)
    .reduceMotion(ReduceMotion.System);

export const enterFade = FadeIn.duration(180).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
export const exitFade = FadeOut.duration(140).easing(EASE_IN).reduceMotion(ReduceMotion.System);

export const enterBar = FadeInDown.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
export const exitBar = FadeOutDown.duration(160).easing(EASE_IN).reduceMotion(ReduceMotion.System);

export const layout = LinearTransition.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
