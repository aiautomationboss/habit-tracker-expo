import { Stack, useRouter, useSegments } from 'expo-router';
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
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

export default function RootLayout() {
  const c = useColors();
  const theme = useHabits((s) => s.theme);
  const hydrated = useHabits((s) => s.hydrated);
  const userId = useHabits((s) => s.userId);
  const setUserId = useHabits((s) => s.setUserId);
  const router = useRouter();
  const segments = useSegments();

  // 1. Subscribe to Supabase auth changes for the lifetime of the app.
  useEffect(() => {
    let cancelled = false;
    // Pick up the persisted session on cold start.
    getSession().then((session) => {
      if (cancelled) return;
      setUserId(session?.user.id ?? null);
    });
    const { data } = onAuthStateChange((uid) => {
      setUserId(uid);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. When signed-in user changes, start / stop the sync layer.
  useEffect(() => {
    if (userId) {
      startSync(userId);
    } else {
      stopSync();
    }
    return () => {
      // No-op; stopSync is idempotent and runs on next user change.
    };
  }, [userId]);

  // 3. Once hydrated, schedule any reminder notifications.
  useEffect(() => {
    if (!hydrated) return;
    const s = useHabits.getState();
    const hasReminders = s.reminderEnabled || s.habits.some((h) => h.reminder);
    if (hasReminders) syncNotifications();
  }, [hydrated]);

  // 4. Reactive sign-out redirect: if the user signs out from any screen,
  //    bounce them back to /auth.
  useEffect(() => {
    if (!hydrated) return;
    const onAuth = segments[0] === 'auth';
    if (!userId && !onAuth) {
      router.replace('/auth');
    } else if (userId && onAuth) {
      router.replace('/');
    }
  }, [userId, hydrated, segments, router]);

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
