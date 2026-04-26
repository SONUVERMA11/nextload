/**
 * DownloadCard Component
 * Animated progress card with status, speed, ETA, swipe-to-delete
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { DownloadItem, useDownloadsStore } from '../store/downloads.store';
import { formatBytes } from '../utils/formatBytes';
import { formatSpeed, formatETA } from '../utils/formatSpeed';
import { getLinkTypeIcon, getLinkTypeColor } from '../services/linkDetector';
import * as downloadService from '../services/download.service';

interface DownloadCardProps {
  item: DownloadItem;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({ item }) => {
  const { colors, radii, spacing, typography: typo } = useTheme();
  const removeDownload = useDownloadsStore((s) => s.removeDownload);

  const handlePause = useCallback(() => {
    if (item.status === 'downloading') {
      downloadService.pauseDownload(item.id);
    } else if (item.status === 'paused' || item.status === 'queued') {
      downloadService.resumeDownload(item.id);
    }
  }, [item.id, item.status]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Download', `Remove "${item.fileName}"?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => downloadService.cancelDownload(item.id),
      },
    ]);
  }, [item.id, item.fileName]);

  const handleRetry = useCallback(() => {
    downloadService.resumeDownload(item.id);
  }, [item.id]);

  // Status-specific styling
  const statusConfig = getStatusConfig(item.status, colors);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
          borderLeftWidth: 3,
          borderLeftColor: statusConfig.accentColor,
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${getLinkTypeColor(item.linkType)}15`,
              borderRadius: radii.md,
            },
          ]}
        >
          <Icon
            name={getLinkTypeIcon(item.linkType) as any}
            size={20}
            color={getLinkTypeColor(item.linkType)}
          />
        </View>

        <View style={[styles.titleContainer, { marginLeft: spacing.md }]}>
          <Text
            style={[typo.bodyBold, { color: colors.text }]}
            numberOfLines={2}
            ellipsizeMode="middle"
          >
            {item.title || item.fileName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[typo.caption2, { color: colors.muted }]}>
              {item.linkType.toUpperCase()}
            </Text>
            {item.quality && (
              <View
                style={[
                  styles.qualityBadge,
                  { backgroundColor: colors.purpleSoft, marginLeft: 6 },
                ]}
              >
                <Text style={[typo.caption2, { color: colors.purple }]}>
                  {item.quality}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={item.status === 'failed' ? handleRetry : handlePause}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[
            styles.actionButton,
            {
              backgroundColor: statusConfig.bgColor,
              borderRadius: radii.full,
            },
          ]}
        >
          <Icon name={statusConfig.actionIcon as any} size={18} color={statusConfig.accentColor} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      {(item.status === 'downloading' || item.status === 'paused' || item.status === 'converting') && (
        <View style={[styles.progressTrack, { backgroundColor: colors.progressTrack, marginTop: spacing.md }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: statusConfig.accentColor,
                width: `${Math.min(item.progress, 100)}%`,
              },
            ]}
          />
        </View>
      )}

      {/* Stats Row */}
      <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
        {/* Left: Size info */}
        <Text style={[typo.caption1, { color: colors.muted }]}>
          {item.status === 'completed'
            ? formatBytes(item.fileSize || item.downloadedBytes)
            : `${formatBytes(item.downloadedBytes)}${item.fileSize ? ` / ${formatBytes(item.fileSize)}` : ''}`}
        </Text>

        {/* Right: Speed / Status */}
        <View style={styles.rightStats}>
          {item.status === 'downloading' && (
            <>
              <Icon name="speedometer-outline" size={12} color={colors.accent} />
              <Text style={[typo.mono, { color: colors.accent, marginLeft: 4 }]}>
                {formatSpeed(item.speed)}
              </Text>
              <Text style={[typo.caption2, { color: colors.muted, marginLeft: 8 }]}>
                ETA {formatETA(item.eta)}
              </Text>
            </>
          )}
          {item.status === 'paused' && (
            <Text style={[typo.caption1, { color: colors.warning }]}>Paused</Text>
          )}
          {item.status === 'queued' && (
            <Text style={[typo.caption1, { color: colors.muted }]}>Queued</Text>
          )}
          {item.status === 'completed' && (
            <View style={styles.completedBadge}>
              <Icon name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[typo.caption1, { color: colors.success, marginLeft: 4 }]}>
                Done
              </Text>
            </View>
          )}
          {item.status === 'failed' && (
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Icon name="refresh" size={14} color={colors.danger} />
              <Text style={[typo.caption1, { color: colors.danger, marginLeft: 4 }]}>
                Retry ({item.retryCount}/{item.maxRetries})
              </Text>
            </TouchableOpacity>
          )}
          {item.status === 'converting' && (
            <Text style={[typo.caption1, { color: colors.purple }]}>Converting...</Text>
          )}
        </View>
      </View>

      {/* Error / Status Message */}
      {item.error && (
        <Text
          style={[
            typo.caption2,
            {
              color: item.status === 'failed' ? colors.danger : colors.muted,
              marginTop: spacing.xs,
            },
          ]}
          numberOfLines={2}
        >
          {item.status === 'failed' ? '⚠ ' : '⏳ '}{item.error}
        </Text>
      )}

      {/* Torrent Seeds/Peers */}
      {(item.linkType === 'magnet' || item.linkType === 'torrent') && item.seeds !== undefined && (
        <View style={[styles.torrentStats, { marginTop: spacing.xs }]}>
          <Icon name="arrow-up-circle" size={12} color={colors.success} />
          <Text style={[typo.caption2, { color: colors.muted, marginLeft: 2 }]}>
            {item.seeds} seeds
          </Text>
          <Icon name="arrow-down-circle" size={12} color={colors.warning} style={{ marginLeft: 8 }} />
          <Text style={[typo.caption2, { color: colors.muted, marginLeft: 2 }]}>
            {item.peers} peers
          </Text>
        </View>
      )}

      {/* Cancel Button (subtle) */}
      {item.status !== 'completed' && (
        <TouchableOpacity
          onPress={handleCancel}
          style={[styles.cancelButton, { position: 'absolute', top: 12, right: 12 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="close" size={16} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Status Config Helper ────────────────────────────────────────────────

const getStatusConfig = (status: string, colors: any) => {
  switch (status) {
    case 'downloading':
      return {
        accentColor: colors.accent,
        bgColor: colors.accentSoft,
        actionIcon: 'pause',
      };
    case 'paused':
      return {
        accentColor: colors.warning,
        bgColor: colors.warningSoft,
        actionIcon: 'play',
      };
    case 'queued':
      return {
        accentColor: colors.muted,
        bgColor: colors.progressTrack,
        actionIcon: 'play',
      };
    case 'completed':
      return {
        accentColor: colors.success,
        bgColor: colors.successSoft,
        actionIcon: 'checkmark',
      };
    case 'failed':
      return {
        accentColor: colors.danger,
        bgColor: colors.dangerSoft,
        actionIcon: 'refresh',
      };
    case 'converting':
      return {
        accentColor: colors.purple,
        bgColor: colors.purpleSoft,
        actionIcon: 'sync',
      };
    default:
      return {
        accentColor: colors.muted,
        bgColor: colors.progressTrack,
        actionIcon: 'download',
      };
  }
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  qualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  torrentStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {},
});
