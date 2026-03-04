import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_KEY = '@fish_app_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [isLoaded, setIsLoaded] = useState(false);
    const systemColorScheme = useRNColorScheme();

    // Load saved theme preference from AsyncStorage
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const saved = await AsyncStorage.getItem(THEME_KEY);
                if (saved) {
                    setThemeModeState(saved as ThemeMode);
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            } finally {
                setIsLoaded(true);
            }
        };

        loadTheme();
    }, []);

    const setThemeMode = async (mode: ThemeMode) => {
        try {
            setThemeModeState(mode);
            await AsyncStorage.setItem(THEME_KEY, mode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    // Determine actual current theme
    const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

    return (
        <ThemeContext.Provider
            value={{
                themeMode,
                setThemeMode,
                isDark,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
