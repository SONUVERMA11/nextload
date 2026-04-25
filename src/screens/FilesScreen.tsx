/**
 * Files Screen
 * Built-in file manager for /Downloads/NexLoad/
 * Folders: Videos / Audio / Torrents / Other
 * Long-press context menu: share, delete, rename, open with
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { FileCard, FileItem, getFileType } from '../components/FileCard';
import { formatBytes } from '../utils/formatBytes';

// Default folder structure
const DEFAULT_FOLDERS: FileItem[] = [
  {
    name: 'Videos',
    path: '/storage/emulated/0/Download/NexLoad/Videos',
    size: 0,
    isDirectory: true,
    modifiedAt: Date.now(),
    type: 'video',
  },
  {
    name: 'Audio',
    path: '/storage/emulated/0/Download/NexLoad/Audio',
    size: 0,
    isDirectory: true,
    modifiedAt: Date.now(),
    type: 'audio',
  },
  {
    name: 'Torrents',
    path: '/storage/emulated/0/Download/NexLoad/Torrents',
    size: 0,
    isDirectory: true,
    modifiedAt: Date.now(),
    type: 'torrent',
  },
  {
    name: 'Other',
    path: '/storage/emulated/0/Download/NexLoad/Other',
    size: 0,
    isDirectory: true,
    modifiedAt: Date.now(),
    type: 'other',
  },
];

// Mock file data for UI demonstration
const MOCK_FILES: FileItem[] = [
  {
    name: 'sample_video.mp4',
    path: '/storage/emulated/0/Download/NexLoad/Videos/sample_video.mp4',
    size: 524288000,
    isDirectory: false,
    modifiedAt: Date.now() - 86400000,
    type: 'video',
  },
  {
    name: 'podcast_episode.mp3',
    path: '/storage/emulated/0/Download/NexLoad/Audio/podcast_episode.mp3',
    size: 15728640,
    isDirectory: false,
    modifiedAt: Date.now() - 172800000,
    type: 'audio',
  },
  {
    name: 'document.pdf',
    path: '/storage/emulated/0/Download/NexLoad/Other/document.pdf',
    size: 2097152,
    isDirectory: false,
    modifiedAt: Date.now() - 259200000,
    type: 'document',
  },
];

export const FilesScreen: React.FC = () => {
  const { colors, radii, spacing, typography: typo } = useTheme();
  const [currentPath, setCurrentPath] = useState('/storage/emulated/0/Download/NexLoad');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const isRoot = currentPath === '/storage/emulated/0/Download/NexLoad';

  // Load files for current directory
  const loadFiles = useCallback(async () => {
    try {
      // In production, use react-native-fs:
      // const items = await RNFS.readDir(currentPath);
      // setFiles(items.map(item => ({
      //   name: item.name,
      //   path: item.path,
      //   size: item.size || 0,
      //   isDirectory: item.isDirectory(),
      //   modifiedAt: new Date(item.mtime || Date.now()).getTime(),
      //   type: getFileType(item.name),
      // })));

      // Demo data
      if (isRoot) {
        setFiles(DEFAULT_FOLDERS);
      } else {
        setFiles(MOCK_FILES.filter((f) => f.path.startsWith(currentPath)));
      }
    } catch (error) {
      console.error('[Files] Error reading directory:', error);
      setFiles([]);
    }
  }, [currentPath, isRoot]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }, [loadFiles]);

  const handleFilePress = useCallback(
    (file: FileItem) => {
      if (file.isDirectory) {
        setCurrentPath(file.path);
      } else {
        // Open file with system handler
        console.log('Open file:', file.path);
        // In production: await IntentLauncher.startActivity(...)
      }
    },
    []
  );

  const handleBack = useCallback(() => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    if (parentPath.includes('NexLoad')) {
      setCurrentPath(parentPath);
    }
  }, [currentPath]);

  // Storage Stats
  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + (f.isDirectory ? 0 : f.size), 0),
    [files]
  );

  const currentFolderName = currentPath.split('/').pop() || 'Files';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header with breadcrumb */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          {!isRoot && (
            <TouchableOpacity onPress={handleBack} style={{ marginRight: spacing.md }}>
              <Icon name="arrow-back" size={22} color={colors.accent} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={[typo.headline, { color: colors.text }]}>
              {currentFolderName}
            </Text>
            <Text style={[typo.caption2, { color: colors.muted }]}>
              {files.length} items{!isRoot ? ` · ${formatBytes(totalSize)}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={{ padding: spacing.xs }}
          >
            <Icon
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Storage Indicator (root only) */}
      {isRoot && (
        <View
          style={[
            styles.storageCard,
            {
              backgroundColor: colors.card,
              borderRadius: radii.lg,
              margin: spacing.lg,
              padding: spacing.lg,
            },
          ]}
        >
          <View style={styles.storageHeader}>
            <Icon name="folder-open" size={20} color={colors.accent} />
            <Text style={[typo.bodyBold, { color: colors.text, marginLeft: spacing.sm }]}>
              NexLoad Storage
            </Text>
          </View>
          <View
            style={[
              styles.storageBar,
              {
                backgroundColor: colors.progressTrack,
                borderRadius: 4,
                marginTop: spacing.md,
              },
            ]}
          >
            <View
              style={[
                styles.storageUsed,
                {
                  backgroundColor: colors.accent,
                  width: '15%',
                  borderRadius: 4,
                },
              ]}
            />
          </View>
          <View style={[styles.storageMeta, { marginTop: spacing.sm }]}>
            <Text style={[typo.caption2, { color: colors.muted }]}>
              {formatBytes(541868032)} used
            </Text>
            <Text style={[typo.caption2, { color: colors.muted }]}>
              {formatBytes(32212254720)} available
            </Text>
          </View>
        </View>
      )}

      {/* File List */}
      <FlatList
        data={files}
        renderItem={({ item }) => (
          <FileCard file={item} onPress={handleFilePress} />
        )}
        keyExtractor={(item) => item.path}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="folder-open-outline" size={48} color={colors.border} />
            <Text style={[typo.body, { color: colors.muted, marginTop: spacing.md }]}>
              No files yet
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storageCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageBar: {
    height: 8,
    overflow: 'hidden',
  },
  storageUsed: {
    height: '100%',
  },
  storageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
});
