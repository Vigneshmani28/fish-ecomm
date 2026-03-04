import { useColorScheme as useRNColorScheme } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export function useColorScheme() {
  try {
    const { themeMode } = useTheme();
    const systemColorScheme = useRNColorScheme();

    if (themeMode === 'system') {
      return systemColorScheme;
    }
    return themeMode;
  } catch {
    // Fallback if ThemeProvider is not available
    return useRNColorScheme();
  }
}
