/**
 * ThemeToggle Component
 * Three-state toggle: Light / Dark / System
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../theme/ThemeProvider';

interface ThemeToggleProps {
  compact?: boolean;
}

const MODES: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'light', icon: 'sunny', label: 'Light' },
  { mode: 'system', icon: 'phone-portrait', label: 'System' },
  { mode: 'dark', icon: 'moon', label: 'Dark' },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { colors, mode, setMode, radii, spacing, typography: typo } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.progressTrack,
          borderRadius: radii.lg,
          padding: 3,
        },
      ]}
    >
      {MODES.map(({ mode: m, icon, label }) => {
        const isActive = mode === m;
        return (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            activeOpacity={0.7}
            style={[
              styles.option,
              {
                backgroundColor: isActive ? colors.card : 'transparent',
                borderRadius: radii.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
              },
              isActive && styles.activeShadow,
            ]}
          >
            <Icon
              name={icon}
              size={compact ? 16 : 18}
              color={isActive ? colors.accent : colors.muted}
            />
            {!compact && (
              <Text
                style={[
                  typo.caption1,
                  {
                    color: isActive ? colors.text : colors.muted,
                    marginLeft: 6,
                  },
                ]}
              >
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});
