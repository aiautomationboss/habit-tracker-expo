import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import { useHabits } from '../src/store/useHabits';
import { useColors } from '../src/lib/useColors';
import { syncNotifications } from '../src/lib/notifications';
import { onAuthStateChange, getSession } from '../src/lib/supabase';
import { startSync, stopSync } from '../src/lib/sync';

// Expected in Expo Go: push (remote) notifications were removed in SDK 53.
// We only use local scheduled notifications, so this warning is noise.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function RootLayout() {
  const c = useColors();
  const theme = useHabits((s) => s.theme);
  const hydrated = useHabits((s) => s.hydrated);
  const userId = useHabits((s) => s.userId);
  const setUserId = useHabits((s) => s.setUserId);

  // Subscribe to Supabase auth events. NEVER call router.replace() from
  // here — that races the navigator mount and throws "Attempted to navigate
  // before mounting the Root Layout". Sign-in / sign-out navigation is
  // handled in the action handlers (app/auth.tsx submit, app/(tabs)/
  // settings.tsx onSignOut). The declarative gate at app/index.tsx handles
  // first-launch routing.
  useEffect(() => {
    let cancelled = false;
    getSession().then((session) => {
      if (!cancelled) setUserId(session?.user.id ?? null);
    });
    const { data } = onAuthStateChange((uid) => setUserId(uid));
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start / stop sync when the signed-in user changes.
  useEffect(() => {
    if (userId) startSync(userId);
    else stopSync();
  }, [userId]);

  // Schedule reminder notifications once hydrated.
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
        <Stack.Screen name="auth" />
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
