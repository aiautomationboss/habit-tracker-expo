import { useColorScheme } from 'react-native';
import { useHabits } from '../store/useHabits';
import { Palette, palettes } from '../theme';

export function useColors(): Palette {
  const theme = useHabits((s) => s.theme);
  const system = useColorScheme();
  if (theme === 'system') {
    return palettes[system === 'light' ? 'light' : 'dark'];
  }
  return palettes[theme];
}
