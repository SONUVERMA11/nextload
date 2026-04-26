/**
 * FileCard Component
 * File manager item with icon, size, date, and context menu
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { formatBytes } from '../utils/formatBytes';

export interface FileItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: number;
  type: 'video' | 'audio' | 'torrent' | 'image' | 'document' | 'archive' | 'other';
}

interface FileCardProps {
  file: FileItem;
  onPress?: (file: FileItem) => void;
  onLongPress?: (file: FileItem) => void;
}

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  video: { icon: 'videocam', color: '#FF3B30' },
  audio: { icon: 'musical-notes', color: '#AF52DE' },
  torrent: { icon: 'magnet', color: '#FF6B35' },
  image: { icon: 'image', color: '#34C759' },
  document: { icon: 'document-text', color: '#007AFF' },
  archive: { icon: 'file-tray-full', color: '#FF9500' },
  other: { icon: 'document', color: '#8E8E93' },
  folder: { icon: 'folder', color: '#FFD60A' },
};

export const FileCard: React.FC<FileCardProps> = ({ file, onPress, onLongPress }) => {
  const { colors, radii, spacing, typography: typo } = useTheme();

  const iconConfig = file.isDirectory
    ? FILE_ICONS.folder
    : FILE_ICONS[file.type] || FILE_ICONS.other;

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress(file);
      return;
    }

    // Default context menu
    Alert.alert(file.name, undefined, [
      {
        text: 'Open',
        onPress: () => onPress?.(file),
      },
      { text: 'Share', onPress: () => console.log('Share', file.path) },
      { text: 'Rename', onPress: () => console.log('Rename', file.name) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => console.log('Delete', file.path),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [file, onPress, onLongPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress?.(file)}
      onLongPress={handleLongPress}
      delayLongPress={400}
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
      {/* File Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${iconConfig.color}15`,
            borderRadius: radii.md,
          },
        ]}
      >
        <Icon name={iconConfig.icon} size={22} color={iconConfig.color} />
      </View>

      {/* File Info */}
      <View style={[styles.infoContainer, { marginLeft: spacing.md }]}>
        <Text
          style={[typo.body, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {file.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[typo.caption2, { color: colors.muted }]}>
            {file.isDirectory ? 'Folder' : formatBytes(file.size)}
          </Text>
          <Text style={[typo.caption2, { color: colors.muted, marginLeft: 12 }]}>
            {new Date(file.modifiedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
};

/**
 * Determine file type from extension
 */
export const getFileType = (fileName: string): FileItem['type'] => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, FileItem['type']> = {
    mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', webm: 'video', flv: 'video',
    mp3: 'audio', flac: 'audio', aac: 'audio', ogg: 'audio', wav: 'audio', m4a: 'audio',
    torrent: 'torrent',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
    pdf: 'document', doc: 'document', docx: 'document', txt: 'document', xlsx: 'document',
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  };
  return typeMap[ext] || 'other';
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
});
