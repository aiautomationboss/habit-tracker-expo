import { Redirect } from 'expo-router';
import { useHabits } from '../src/store/useHabits';

// Entry gate. Renders a declarative redirect once the store has hydrated,
// which expo-router resolves after the navigator is mounted (no imperative
// navigation, so it can't fire before the Root Layout is ready).
export default function Index() {
  const hydrated = useHabits((s) => s.hydrated);
  const onboarded = useHabits((s) => s.onboarded);

  if (!hydrated) return null;
  return <Redirect href={onboarded ? '/today' : '/onboarding'} />;
}
