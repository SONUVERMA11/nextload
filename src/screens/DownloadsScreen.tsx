/**
 * Downloads Screen
 * Main screen showing active/completed downloads with speed banner
 * FAB to add new downloads, pull-to-refresh, swipe-to-delete
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useDownloadsStore, DownloadItem } from '../store/downloads.store';
import { useClipboardWatcher } from '../hooks/useClipboardWatcher';
import { DownloadCard } from '../components/DownloadCard';
import { SpeedBanner } from '../components/SpeedBanner';
import { AddDownloadSheet } from '../components/AddDownloadSheet';
import { DownloadCardSkeleton } from '../components/SkeletonLoader';

type SectionType = 'active' | 'completed';

interface SectionItem {
  type: 'header' | 'download' | 'empty';
  section: SectionType;
  data?: DownloadItem;
  title?: string;
  count?: number;
}

export const DownloadsScreen: React.FC = () => {
  const { colors, radii, spacing, typography: typo, isDark } = useTheme();
  const downloads = useDownloadsStore((s) => s.downloads);
  const clearCompleted = useDownloadsStore((s) => s.clearCompleted);
  const [showSheet, setShowSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState('');

  // Clipboard watcher
  const { detection, dismiss } = useClipboardWatcher({
    onUrlDetected: (d) => setClipboardUrl(d.url),
  });

  // Separate active and completed downloads
  const activeDownloads = useMemo(
    () => downloads.filter((d) => d.status !== 'completed'),
    [downloads]
  );
  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'completed'),
    [downloads]
  );

  // Build flat list data with section headers
  const listData = useMemo<SectionItem[]>(() => {
    const items: SectionItem[] = [];

    // Active section
    if (activeDownloads.length > 0) {
      items.push({
        type: 'header',
        section: 'active',
        title: 'Active',
        count: activeDownloads.length,
      });
      activeDownloads.forEach((d) =>
        items.push({ type: 'download', section: 'active', data: d })
      );
    }

    // Completed section
    if (completedDownloads.length > 0) {
      items.push({
        type: 'header',
        section: 'completed',
        title: 'Completed',
        count: completedDownloads.length,
      });
      completedDownloads.forEach((d) =>
        items.push({ type: 'download', section: 'completed', data: d })
      );
    }

    // Empty state
    if (items.length === 0) {
      items.push({ type: 'empty', section: 'active' });
    }

    return items;
  }, [activeDownloads, completedDownloads]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      if (item.type === 'header') {
        return (
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
            ]}
          >
            <Text style={[typo.headline, { color: colors.text }]}>
              {item.title}
            </Text>
            <View style={styles.sectionRight}>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={[typo.caption1, { color: colors.accent }]}>
                  {item.count}
                </Text>
              </View>
              {item.section === 'completed' && (
                <TouchableOpacity
                  onPress={clearCompleted}
                  style={{ marginLeft: spacing.sm }}
                >
                  <Text style={[typo.caption1, { color: colors.danger }]}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      }

      if (item.type === 'empty') {
        return (
          <View style={styles.emptyState}>
            <Icon name="cloud-download-outline" size={64} color={colors.border} />
            <Text
              style={[
                typo.title3,
                { color: colors.muted, marginTop: spacing.lg, textAlign: 'center' },
              ]}
            >
              No Downloads Yet
            </Text>
            <Text
              style={[
                typo.subheadline,
                { color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
              ]}
            >
              Tap the + button to add your first download
            </Text>
          </View>
        );
      }

      if (item.data) {
        return <DownloadCard item={item.data} />;
      }

      return null;
    },
    [colors, spacing, typo, clearCompleted]
  );

  const keyExtractor = useCallback(
    (item: SectionItem, index: number) =>
      item.type === 'download' && item.data ? item.data.id : `${item.type}_${index}`,
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Clipboard URL Banner */}
      {detection && (
        <TouchableOpacity
          onPress={() => {
            setShowSheet(true);
            dismiss();
          }}
          style={[
            styles.clipboardBanner,
            {
              backgroundColor: colors.accentSoft,
              marginHorizontal: spacing.lg,
              marginTop: spacing.sm,
              borderRadius: radii.lg,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: `${colors.accent}30`,
            },
          ]}
        >
          <Icon name="clipboard-outline" size={18} color={colors.accent} />
          <Text
            style={[typo.caption1, { color: colors.accent, flex: 1, marginLeft: spacing.sm }]}
            numberOfLines={1}
          >
            Download from clipboard?
          </Text>
          <TouchableOpacity onPress={dismiss}>
            <Icon name="close" size={18} color={colors.muted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Speed Banner */}
      <SpeedBanner />

      {/* Downloads List */}
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />

      {/* FAB — Add Download */}
      <TouchableOpacity
        onPress={() => setShowSheet(true)}
        activeOpacity={0.85}
        style={[
          styles.fab,
          {
            backgroundColor: colors.fab,
            borderRadius: radii.full,
            shadowColor: colors.accent,
          },
        ]}
      >
        <Icon name="add" size={28} color={colors.fabIcon} />
      </TouchableOpacity>

      {/* Add Download Sheet */}
      <AddDownloadSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        initialUrl={clipboardUrl}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  clipboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
