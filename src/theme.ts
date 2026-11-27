import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';

const ACCENT = { primary: '#C9F24D', onPrimary: '#1A2300', container: '#2E3A0B', onContainer: '#DDF98F' };

export const BASE = {
  background: '#0E0F0C',
  surface: '#0E0F0C',
  container: '#171915',
  containerHigh: '#1F221D',
  containerHighest: '#292C26',
  outline: '#3A3E36',
  outlineVariant: '#2A2D27',
  text: '#ECEEE6',
  textMuted: '#A3A89B',
  textFaint: '#71776A',
  ok: '#7BD88F',
  warn: '#F2C14E',
  danger: '#FF6B6B',
  pr: '#FFD166',
  warmup: '#F2C14E',
  drop: '#7AB8FF',
  failure: '#FF6B6B',
};

function makeTheme(): MD3Theme {
  const a = ACCENT;
  return {
    ...MD3DarkTheme,
    roundness: 5, // MD3 multiplies — cards get 20px
    colors: {
      ...MD3DarkTheme.colors,
      primary: a.primary,
      onPrimary: a.onPrimary,
      primaryContainer: a.container,
      onPrimaryContainer: a.onContainer,
      secondary: '#B7C2A8',
      onSecondary: '#22291A',
      secondaryContainer: '#2B3124',
      onSecondaryContainer: '#D3DEC3',
      tertiary: BASE.pr,
      background: BASE.background,
      onBackground: BASE.text,
      surface: BASE.surface,
      onSurface: BASE.text,
      surfaceVariant: BASE.containerHigh,
      onSurfaceVariant: BASE.textMuted,
      outline: BASE.outline,
      outlineVariant: BASE.outlineVariant,
      error: BASE.danger,
      inverseSurface: '#E3E6DC',
      inverseOnSurface: '#1A1C18',
      inversePrimary: a.container,
      elevation: {
        level0: 'transparent',
        level1: BASE.container,
        level2: BASE.containerHigh,
        level3: BASE.containerHighest,
        level4: '#2E322B',
        level5: '#333730',
      },
      surfaceDisabled: 'rgba(236,238,230,0.12)',
      onSurfaceDisabled: 'rgba(236,238,230,0.38)',
      backdrop: 'rgba(0,0,0,0.6)',
    },
  };
}

export const THEME = makeTheme();

export const SET_TYPE_STYLE = {
  normal: { label: '', color: BASE.text },
  warmup: { label: 'W', color: BASE.warmup },
  failure: { label: 'F', color: BASE.failure },
  drop: { label: 'D', color: BASE.drop },
} as const;
