import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { BottomNavigation, Icon } from 'react-native-paper';
import { ActiveBanner } from '@/components/ActiveBanner';
import { BASE } from '@/theme';

const ICONS: Record<string, [string, string]> = {
  index: ['dumbbell', 'dumbbell'],
  history: ['calendar-blank-outline', 'calendar-blank'],
  progress: ['chart-line', 'chart-line'],
  body: ['human-handsup', 'human-handsup'],
  more: ['dots-horizontal-circle-outline', 'dots-horizontal-circle'],
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'shift' }}
      tabBar={({ navigation, state, descriptors, insets }) => (
        <View>
          <ActiveBanner />
          <BottomNavigation.Bar
            navigationState={state}
            safeAreaInsets={insets}
            style={{ backgroundColor: BASE.container }}
            onTabPress={({ route, preventDefault }) => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (event.defaultPrevented) preventDefault();
              else navigation.dispatch({ ...CommonActions.navigate(route.name, route.params), target: state.key });
            }}
            renderIcon={({ route, focused, color }) => <Icon source={ICONS[route.name]?.[focused ? 1 : 0] ?? 'circle'} size={24} color={color} />}
            getLabelText={({ route }) => descriptors[route.key].options.title ?? route.name}
          />
        </View>
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Train' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="body" options={{ title: 'Body' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
