/**
 * AddDownloadSheet Component
 * Bottom sheet modal for adding new downloads
 * Auto-detects link type and shows appropriate options
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { detectLink, isValidUrl, supportsQualitySelection } from '../utils/linkDetector';
import { VIDEO_QUALITIES, AUDIO_QUALITIES } from '../services/ytdlp.service';
import * as downloadService from '../services/download.service';

interface AddDownloadSheetProps {
  visible: boolean;
  onClose: () => void;
  initialUrl?: string;
}

export const AddDownloadSheet: React.FC<AddDownloadSheetProps> = ({
  visible,
  onClose,
  initialUrl = '',
}) => {
  const { colors, radii, spacing, typography: typo, isDark } = useTheme();
  const [url, setUrl] = useState(initialUrl);
  const [urls, setUrls] = useState(''); // For batch mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080');
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [audioQuality, setAudioQuality] = useState<'128' | '192' | '320' | 'flac'>('320');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect link type
  const detection = url.trim() ? detectLink(url.trim()) : null;
  const showQuality = detection && supportsQualitySelection(detection.type);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const Clipboard = require('expo-clipboard');
      const content = await Clipboard.getStringAsync();
      if (content) {
        if (isBatchMode) {
          setUrls((prev) => (prev ? `${prev}\n${content}` : content));
        } else {
          setUrl(content);
        }
      }
    } catch {
      // Silent fail
    }
  }, [isBatchMode]);

  const handleDownload = useCallback(async () => {
    if (isBatchMode) {
      const urlList = urls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      if (urlList.length === 0) {
        Alert.alert('No URLs', 'Please enter at least one URL');
        return;
      }

      setIsLoading(true);
      try {
        await downloadService.batchDownload(urlList);
        onClose();
        setUrls('');
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
      setIsLoading(false);
      return;
    }

    if (!url.trim() || !isValidUrl(url.trim())) {
      Alert.alert('Invalid URL', 'Please enter a valid URL or magnet link');
      return;
    }

    setIsLoading(true);
    try {
      await downloadService.startDownload({
        url: url.trim(),
        quality: isAudioOnly ? undefined : selectedQuality,
        isAudioExtraction: isAudioOnly,
        audioQuality: isAudioOnly ? audioQuality : undefined,
      });
      onClose();
      setUrl('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
    setIsLoading(false);
  }, [url, urls, isBatchMode, selectedQuality, isAudioOnly, audioQuality, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.sheet,
                borderTopLeftRadius: radii.xxl,
                borderTopRightRadius: radii.xxl,
              },
            ]}
          >
            {/* Handle Bar */}
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
              <Text style={[typo.title3, { color: colors.text }]}>
                Add Download
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Icon name="close-circle" size={28} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mode Toggle */}
              <View style={[styles.modeToggle, { marginTop: spacing.lg }]}>
                <TouchableOpacity
                  onPress={() => setIsBatchMode(false)}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: !isBatchMode ? colors.accent : 'transparent',
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typo.caption1,
                      { color: !isBatchMode ? '#FFF' : colors.muted },
                    ]}
                  >
                    Single
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsBatchMode(true)}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: isBatchMode ? colors.accent : 'transparent',
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typo.caption1,
                      { color: isBatchMode ? '#FFF' : colors.muted },
                    ]}
                  >
                    Batch
                  </Text>
                </TouchableOpacity>
              </View>

              {/* URL Input */}
              <View style={{ marginTop: spacing.lg }}>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.bg,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: detection ? detection.color : colors.border,
                    },
                  ]}
                >
                  {/* Detection Icon */}
                  {detection && !isBatchMode && (
                    <View style={[styles.detectionIcon, { marginLeft: spacing.md }]}>
                      <Icon
                        name={detection.icon as any}
                        size={20}
                        color={detection.color}
                      />
                    </View>
                  )}

                  <TextInput
                    value={isBatchMode ? urls : url}
                    onChangeText={isBatchMode ? setUrls : setUrl}
                    placeholder={
                      isBatchMode
                        ? 'Paste URLs (one per line)...'
                        : 'Paste URL, magnet link, or t.me link...'
                    }
                    placeholderTextColor={colors.placeholder}
                    style={[
                      typo.body,
                      styles.input,
                      {
                        color: colors.text,
                        minHeight: isBatchMode ? 100 : 44,
                      },
                    ]}
                    multiline={isBatchMode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    textAlignVertical={isBatchMode ? 'top' : 'center'}
                  />

                  {/* Paste Button */}
                  <TouchableOpacity
                    onPress={handlePasteFromClipboard}
                    style={[styles.pasteBtn, { marginRight: spacing.sm }]}
                  >
                    <Icon name="clipboard" size={20} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                {/* Detection Label */}
                {detection && !isBatchMode && (
                  <Text
                    style={[
                      typo.caption1,
                      { color: detection.color, marginTop: spacing.xs, marginLeft: spacing.xs },
                    ]}
                  >
                    {detection.label} detected
                  </Text>
                )}
              </View>

              {/* Quality Selector (for video platforms) */}
              {showQuality && !isBatchMode && (
                <View style={{ marginTop: spacing.xl }}>
                  {/* Audio Toggle */}
                  <TouchableOpacity
                    onPress={() => setIsAudioOnly(!isAudioOnly)}
                    style={[
                      styles.audioToggle,
                      {
                        backgroundColor: isAudioOnly ? colors.purpleSoft : colors.bg,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: isAudioOnly ? colors.purple : colors.border,
                        padding: spacing.md,
                        marginBottom: spacing.md,
                      },
                    ]}
                  >
                    <Icon
                      name={isAudioOnly ? 'musical-notes' : 'videocam'}
                      size={18}
                      color={isAudioOnly ? colors.purple : colors.muted}
                    />
                    <Text
                      style={[
                        typo.bodyBold,
                        {
                          color: isAudioOnly ? colors.purple : colors.text,
                          marginLeft: spacing.sm,
                        },
                      ]}
                    >
                      {isAudioOnly ? 'Audio Only (MP3)' : 'Video Download'}
                    </Text>
                  </TouchableOpacity>

                  {/* Quality Options */}
                  <Text style={[typo.caption1, { color: colors.muted, marginBottom: spacing.sm }]}>
                    {isAudioOnly ? 'Audio Quality' : 'Video Quality'}
                  </Text>

                  <View style={styles.qualityGrid}>
                    {(isAudioOnly ? AUDIO_QUALITIES : VIDEO_QUALITIES).map((q) => {
                      const isSelected = isAudioOnly
                        ? audioQuality === q.value
                        : selectedQuality === q.value;

                      return (
                        <TouchableOpacity
                          key={q.value}
                          onPress={() => {
                            if (isAudioOnly) {
                              setAudioQuality(q.value as any);
                            } else {
                              setSelectedQuality(q.value);
                              if (q.value === 'audio') setIsAudioOnly(true);
                            }
                          }}
                          style={[
                            styles.qualityChip,
                            {
                              backgroundColor: isSelected ? colors.accent : colors.bg,
                              borderRadius: radii.md,
                              borderWidth: 1,
                              borderColor: isSelected ? colors.accent : colors.border,
                              padding: spacing.sm,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typo.caption1,
                              {
                                color: isSelected ? '#FFF' : colors.text,
                                textAlign: 'center',
                              },
                            ]}
                          >
                            {q.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Download Button */}
              <TouchableOpacity
                onPress={handleDownload}
                disabled={isLoading}
                activeOpacity={0.8}
                style={[
                  styles.downloadBtn,
                  {
                    backgroundColor: isLoading ? colors.muted : colors.accent,
                    borderRadius: radii.lg,
                    marginTop: spacing.xxl,
                    paddingVertical: spacing.lg,
                  },
                ]}
              >
                <Icon
                  name={isLoading ? 'hourglass' : 'download'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text
                  style={[
                    typo.headline,
                    { color: '#FFFFFF', marginLeft: spacing.sm },
                  ]}
                >
                  {isLoading
                    ? 'Starting...'
                    : isBatchMode
                    ? 'Download All'
                    : 'Download'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detectionIcon: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pasteBtn: {
    padding: 8,
  },
  audioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualityChip: {
    minWidth: '30%',
    flexGrow: 1,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#185FA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
