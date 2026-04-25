/**
 * NexLoad Theme Provider
 * Provides dark/light/system theme context with MMKV persistence
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName, StatusBar } from 'react-native';
import { light, dark } from './colors';

type ThemeColors = typeof light | typeof dark;
import { typography, Typography } from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: ThemeColors;
  typography: Typography;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  spacing: typeof spacing;
  radii: typeof radii;
}

// Spacing scale (4px base)
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

// Border radius scale
const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'system',
}) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark';
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo<ThemeColors>(() => (isDark ? dark : light), [isDark]);

  const handleSetMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    // Persist preference — in production, save to MMKV here
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      colors,
      typography,
      mode,
      isDark,
      setMode: handleSetMode,
      spacing,
      radii,
    }),
    [colors, mode, isDark, handleSetMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={colors.statusBar}
        backgroundColor={colors.bg}
        translucent={false}
      />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { spacing, radii };
