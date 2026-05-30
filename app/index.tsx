import { Redirect } from 'expo-router';
import { useHabits } from '../src/store/useHabits';

// Entry gate. Declarative redirect after hydration so we never imperatively
// navigate before the navigator is mounted.
//
// Routing rules (in order):
//   1. Not hydrated yet → render nothing (the AsyncStorage rehydration
//      finishes within a frame on app start).
//   2. Not signed in → /auth
//   3. Signed in but never onboarded → /onboarding
//   4. Otherwise → /today
export default function Index() {
  const hydrated = useHabits((s) => s.hydrated);
  const userId = useHabits((s) => s.userId);
  const onboarded = useHabits((s) => s.onboarded);

  if (!hydrated) return null;
  if (!userId) return <Redirect href="/auth" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/today" />;
}
