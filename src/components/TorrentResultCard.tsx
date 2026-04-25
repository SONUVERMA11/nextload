/**
 * TorrentResultCard Component
 * Search result card with seed health indicator and one-tap actions
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { SearchResult } from '../services/torrentSearch.service';
import * as downloadService from '../services/download.service';

interface TorrentResultCardProps {
  result: SearchResult;
  onPress?: (result: SearchResult) => void;
}

export const TorrentResultCard: React.FC<TorrentResultCardProps> = ({
  result,
  onPress,
}) => {
  const { colors, radii, spacing, typography: typo } = useTheme();

  // Seed health color
  const seedColor =
    result.seeds >= 1000
      ? colors.seedHigh
      : result.seeds >= 100
      ? colors.seedMid
      : colors.seedLow;

  const handleDownload = useCallback(() => {
    downloadService.startDownload({ url: result.magnet });
  }, [result.magnet]);

  const handleCopyMagnet = useCallback(async () => {
    try {
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      Clipboard.setString(result.magnet);
      Alert.alert('Copied', 'Magnet link copied to clipboard');
    } catch {
      Alert.alert('Error', 'Could not copy to clipboard');
    }
  }, [result.magnet]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress?.(result)}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
        },
      ]}
    >
      {/* Title */}
      <Text
        style={[typo.bodyBold, { color: colors.text }]}
        numberOfLines={2}
      >
        {result.name}
      </Text>

      {/* Meta Row */}
      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        {/* Source Badge */}
        <View
          style={[
            styles.sourceBadge,
            {
              backgroundColor: colors.accentSoft,
              borderRadius: radii.sm,
            },
          ]}
        >
          <Text style={[typo.caption2, { color: colors.accent }]}>
            {result.source}
          </Text>
        </View>

        {/* Category */}
        <Text style={[typo.caption2, { color: colors.muted, marginLeft: 8 }]}>
          {result.category}
        </Text>

        {/* Size */}
        <View style={[styles.sizeBadge, { marginLeft: 'auto' }]}>
          <Icon name="folder-open-outline" size={12} color={colors.muted} />
          <Text style={[typo.caption1, { color: colors.text, marginLeft: 4 }]}>
            {result.size}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        {/* Seeds */}
        <View style={styles.statItem}>
          <View
            style={[
              styles.seedDot,
              { backgroundColor: seedColor },
            ]}
          />
          <Icon name="arrow-up" size={12} color={seedColor} />
          <Text style={[typo.caption1, { color: seedColor, marginLeft: 2 }]}>
            {formatNumber(result.seeds)}
          </Text>
        </View>

        {/* Leeches */}
        <View style={styles.statItem}>
          <Icon name="arrow-down" size={12} color={colors.warning} />
          <Text style={[typo.caption1, { color: colors.muted, marginLeft: 2 }]}>
            {formatNumber(result.leeches)}
          </Text>
        </View>

        {/* Age */}
        {result.age && (
          <View style={styles.statItem}>
            <Icon name="time-outline" size={12} color={colors.muted} />
            <Text style={[typo.caption2, { color: colors.muted, marginLeft: 2 }]}>
              {result.age}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.actions, { marginLeft: 'auto' }]}>
          {/* Copy Magnet */}
          <TouchableOpacity
            onPress={handleCopyMagnet}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.progressTrack, borderRadius: radii.sm },
            ]}
          >
            <Icon name="copy-outline" size={16} color={colors.muted} />
          </TouchableOpacity>

          {/* Download */}
          <TouchableOpacity
            onPress={handleDownload}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.accent,
                borderRadius: radii.sm,
                marginLeft: spacing.sm,
              },
            ]}
          >
            <Icon name="download" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatNumber = (n: number): string => {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  seedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
