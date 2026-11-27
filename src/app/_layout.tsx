import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { THEME as theme, BASE } from '@/theme';

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: theme.colors.primary, background: BASE.background, card: BASE.background, text: BASE.text, border: BASE.outlineVariant },
};

export default function RootLayout() {

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BASE.background }}>
    <PaperProvider theme={theme}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: BASE.background },
            headerTintColor: BASE.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: BASE.background },
            animation: 'ios_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="active" options={{ headerShown: false, animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="pick" options={{ title: 'Add exercises', presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="routine/[id]" options={{ title: 'Routine' }} />
          <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
          <Stack.Screen name="exercise-edit" options={{ title: 'Custom exercise', presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="session/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="summary/[id]" options={{ headerShown: false, animation: 'fade_from_bottom' }} />
          <Stack.Screen name="report" options={{ title: 'Monthly report' }} />
          <Stack.Screen name="measure" options={{ title: 'Measurements', presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="tools" options={{ title: 'Calculators' }} />
          <Stack.Screen name="library" options={{ title: 'Exercise library' }} />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
    </GestureHandlerRootView>
  );
}
