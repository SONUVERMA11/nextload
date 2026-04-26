/**
 * SpeedBanner Component
 * Real-time download speed meter at top of Downloads screen
 * Shows: current speed, total downloaded, active count
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useDownloadSpeed } from '../hooks/useDownloadSpeed';

export const SpeedBanner: React.FC = () => {
  const { colors, radii, spacing, typography: typo, isDark } = useTheme();
  const metrics = useDownloadSpeed();

  if (metrics.activeCount === 0 && metrics.currentSpeed === 0) {
    return null; // Hide when nothing is downloading
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.accentSoft : colors.accentSoft,
          borderRadius: radii.lg,
          marginHorizontal: spacing.lg,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: isDark ? colors.border : `${colors.accent}20`,
        },
      ]}
    >
      {/* Speed Display */}
      <View style={styles.speedRow}>
        <View style={styles.speedLeft}>
          <Icon name="speedometer" size={20} color={colors.accent} />
          <Text
            style={[
              typo.title3,
              styles.speedText,
              { color: colors.accent, marginLeft: 8 },
            ]}
          >
            {metrics.formattedSpeed}
          </Text>
        </View>
        <View style={styles.activeCountBadge}>
          <View
            style={[
              styles.activeDot,
              { backgroundColor: colors.success },
            ]}
          />
          <Text style={[typo.caption1, { color: colors.text }]}>
            {metrics.activeCount} active
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <View style={styles.statItem}>
          <Text style={[typo.caption2, { color: colors.muted }]}>Downloaded</Text>
          <Text style={[typo.bodyBold, { color: colors.text }]}>
            {metrics.formattedTotal}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[typo.caption2, { color: colors.muted }]}>Peak Speed</Text>
          <Text style={[typo.bodyBold, { color: colors.text }]}>
            {metrics.formattedPeakSpeed}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[typo.caption2, { color: colors.muted }]}>Avg Speed</Text>
          <Text style={[typo.bodyBold, { color: colors.text }]}>
            {metrics.formattedAverageSpeed}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedText: {
    fontVariant: ['tabular-nums'],
  },
  activeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
});
