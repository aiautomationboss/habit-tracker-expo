import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import { useHabits } from '../src/store/useHabits';
import { useColors } from '../src/lib/useColors';
import { syncNotifications } from '../src/lib/notifications';

// Expected in Expo Go: push (remote) notifications were removed in SDK 53.
// We only use local scheduled notifications, so this warning is noise.
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

export default function RootLayout() {
  const c = useColors();
  const theme = useHabits((s) => s.theme);
  const hydrated = useHabits((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const s = useHabits.getState();
    const hasReminders = s.reminderEnabled || s.habits.some((h) => h.reminder);
    if (hasReminders) syncNotifications();
  }, [hydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="habit-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="day-detail" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reflection" options={{ presentation: 'modal' }} />
        <Stack.Screen name="milestone" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
