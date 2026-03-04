import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  try {
    const { themeMode } = useTheme();
    const systemColorScheme = useRNColorScheme();

    if (!hasHydrated) {
      return 'light';
    }

    if (themeMode === 'system') {
      return systemColorScheme;
    }
    return themeMode;
  } catch {
    // Fallback if ThemeProvider is not available
    const colorScheme = useRNColorScheme();
    if (hasHydrated) {
      return colorScheme;
    }
    return 'light';
  }
}
