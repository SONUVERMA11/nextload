/**
 * Settings Screen
 * Theme toggle, download preferences, integrations, about
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  TextInput,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settings.store';
import { ThemeToggle } from '../components/ThemeToggle';
import { useDownloadsStore } from '../store/downloads.store';
import * as downloadService from '../services/download.service';

export const SettingsScreen: React.FC = () => {
  const { colors, radii, spacing, typography: typo } = useTheme();
  const settings = useSettingsStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalTitle, setEditModalTitle] = useState('');
  const [editModalValue, setEditModalValue] = useState('');
  const [editModalOnSave, setEditModalOnSave] = useState<((val: string) => void) | null>(null);

  const openEditModal = (title: string, currentValue: string, onSave: (val: string) => void) => {
    setEditModalTitle(title);
    setEditModalValue(currentValue);
    setEditModalOnSave(() => onSave);
    setEditModalVisible(true);
  };
  const totalDownloads = useDownloadsStore((s) => s.downloads.length);

  // Telegram Auth State
  const [telegramAuthStep, setTelegramAuthStep] = useState<'idle' | 'phone' | 'code'>('idle');
  const [telegramPhoneInput, setTelegramPhoneInput] = useState('');
  const [telegramCodeInput, setTelegramCodeInput] = useState('');
  const [telegramPhoneHash, setTelegramPhoneHash] = useState('');
  const [telegramTempSession, setTelegramTempSession] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const startTelegramAuth = () => {
    setTelegramPhoneInput('');
    setTelegramCodeInput('');
    setTelegramAuthStep('phone');
  };

  const handleSendTelegramCode = async () => {
    if (!telegramPhoneInput) return;
    setIsAuthenticating(true);
    try {
      const serverUrl = settings.ytdlpServerUrl || 'https://nexload-ytdlp.onrender.com';
      const res = await fetch(`${serverUrl}/telegram/auth/send_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: telegramPhoneInput.trim() })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || 'Failed to send code');
      }
      const data = await res.json();
      setTelegramPhoneHash(data.phone_code_hash);
      setTelegramTempSession(data.session_string);
      setTelegramAuthStep('code');
    } catch (err: any) {
      Alert.alert('Telegram Error', err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyTelegramCode = async () => {
    if (!telegramCodeInput) return;
    setIsAuthenticating(true);
    try {
      const serverUrl = settings.ytdlpServerUrl || 'https://nexload-ytdlp.onrender.com';
      const res = await fetch(`${serverUrl}/telegram/auth/sign_in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone_number: telegramPhoneInput.trim(),
          code: telegramCodeInput.trim(),
          phone_code_hash: telegramPhoneHash,
          session_string: telegramTempSession
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || 'Failed to verify code');
      }
      const data = await res.json();
      settings.setTelegramAuth(data.session_string, telegramPhoneInput.trim());
      setTelegramAuthStep('idle');
      Alert.alert('Success', 'Telegram account connected successfully!');
    } catch (err: any) {
      Alert.alert('Telegram Error', err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const SectionHeader: React.FC<{ title: string; icon: string }> = ({ title, icon }) => (
    <View style={[styles.sectionHeader, { marginTop: spacing.xxl, paddingHorizontal: spacing.xl }]}>
      <Icon name={icon} size={18} color={colors.accent} />
      <Text style={[typo.headline, { color: colors.text, marginLeft: spacing.sm }]}>
        {title}
      </Text>
    </View>
  );

  const SettingRow: React.FC<{
    label: string;
    value?: string;
    icon: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }> = ({ label, value, icon, onPress, rightElement }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.settingRow,
        {
          backgroundColor: colors.card,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIcon,
            {
              backgroundColor: `${colors.accent}15`,
              borderRadius: radii.sm,
            },
          ]}
        >
          <Icon name={icon} size={18} color={colors.accent} />
        </View>
        <View style={{ marginLeft: spacing.md }}>
          <Text style={[typo.body, { color: colors.text }]}>{label}</Text>
          {value && (
            <Text style={[typo.caption2, { color: colors.muted, marginTop: 2 }]}>
              {value}
            </Text>
          )}
        </View>
      </View>
      {rightElement || (
        onPress && <Icon name="chevron-forward" size={18} color={colors.muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* App Header */}
      <View
        style={[
          styles.appHeader,
          {
            backgroundColor: colors.accent,
            padding: spacing.xxl,
            paddingTop: spacing.xxl + 20,
            paddingBottom: spacing.xxl + 10,
            alignItems: 'center',
          },
        ]}
      >
        {/* Decorative circles */}
        <View style={[styles.headerCircle, styles.headerCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.headerCircle, styles.headerCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

        <View
          style={[
            styles.appIcon,
            {
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
            },
          ]}
        >
          <Icon name="cloud-download" size={36} color="#FFFFFF" />
        </View>
        <Text style={[typo.title2, { color: '#FFFFFF', marginTop: spacing.md, fontSize: 26, fontWeight: '800', letterSpacing: 1 }]}>
          NexLoad
        </Text>
        <Text style={[typo.subheadline, { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs }]}>
          Download Anything. At Full Speed. ⚡
        </Text>
        <View style={[styles.versionBadge, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radii.xl, marginTop: spacing.md }]}>
          <Text style={[typo.caption2, { color: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 4 }]}>
            v1.0.0 · Beta
          </Text>
        </View>
      </View>

      {/* Theme */}
      <SectionHeader title="Appearance" icon="color-palette" />
      <View
        style={[
          styles.themeContainer,
          {
            backgroundColor: colors.card,
            padding: spacing.xl,
          },
        ]}
      >
        <Text style={[typo.bodyBold, { color: colors.text, marginBottom: spacing.md }]}>
          Theme
        </Text>
        <ThemeToggle />
      </View>

      {/* Downloads */}
      <SectionHeader title="Downloads" icon="download" />
      <SettingRow
        label="Download Location"
        value={settings.downloadPath}
        icon="folder"
        onPress={() =>
          Alert.alert('Download Path', 'Select download folder', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset to Default',
              onPress: () =>
                settings.setDownloadPath('/storage/emulated/0/Download/NexLoad'),
            },
          ])
        }
      />
      <SettingRow
        label="Max Concurrent Downloads"
        value={`${settings.maxConcurrentDownloads} simultaneous`}
        icon="layers"
        onPress={() => {
          const options = [1, 2, 3, 4, 5, 6, 7, 8];
          Alert.alert(
            'Concurrent Downloads',
            'Select maximum',
            options.map((n) => ({
              text: `${n}`,
              onPress: () => settings.setMaxConcurrentDownloads(n),
            }))
          );
        }}
      />
      <SettingRow
        label="Speed Limit"
        value={settings.speedLimitEnabled ? `${settings.speedLimitKbps} KB/s` : 'Unlimited'}
        icon="speedometer"
        rightElement={
          <Switch
            value={settings.speedLimitEnabled}
            onValueChange={(v) => settings.setSpeedLimit(v, 1024)}
            trackColor={{ false: colors.progressTrack, true: colors.accent }}
            thumbColor="#FFF"
          />
        }
      />
      <SettingRow
        label="Auto-Retry on Failure"
        value={`${settings.maxRetries} attempts`}
        icon="refresh"
        rightElement={
          <Switch
            value={settings.autoRetryEnabled}
            onValueChange={(v) => settings.setAutoRetry(v)}
            trackColor={{ false: colors.progressTrack, true: colors.accent }}
            thumbColor="#FFF"
          />
        }
      />

      {/* Notifications */}
      <SectionHeader title="Notifications" icon="notifications" />
      <SettingRow
        label="Download Progress"
        value="Show in notification shade"
        icon="stats-chart"
        rightElement={
          <Switch
            value={settings.showDownloadProgress}
            onValueChange={(v) => settings.setNotificationPrefs({ showDownloadProgress: v })}
            trackColor={{ false: colors.progressTrack, true: colors.accent }}
            thumbColor="#FFF"
          />
        }
      />
      <SettingRow
        label="Completion Alert"
        value="Notify when download finishes"
        icon="checkmark-circle"
        rightElement={
          <Switch
            value={settings.showCompletionAlert}
            onValueChange={(v) => settings.setNotificationPrefs({ showCompletionAlert: v })}
            trackColor={{ false: colors.progressTrack, true: colors.accent }}
            thumbColor="#FFF"
          />
        }
      />
      <SettingRow
        label="Vibrate on Complete"
        icon="phone-portrait"
        rightElement={
          <Switch
            value={settings.vibrateOnComplete}
            onValueChange={(v) => settings.setNotificationPrefs({ vibrateOnComplete: v })}
            trackColor={{ false: colors.progressTrack, true: colors.accent }}
            thumbColor="#FFF"
          />
        }
      />

      {/* Integrations */}
      <SectionHeader title="Integrations" icon="extension-puzzle" />
      <SettingRow
        label="yt-dlp Server"
        value={settings.ytdlpServerUrl || 'Not configured'}
        icon="server"
        onPress={() =>
          openEditModal(
            'yt-dlp Server URL',
            settings.ytdlpServerUrl || '',
            (url) => settings.setYtdlpServerUrl(url.trim())
          )
        }
      />
      <SettingRow
        label="Jackett Server"
        value={settings.jackettServerUrl || 'Not configured'}
        icon="search-circle"
        onPress={() =>
          openEditModal(
            'Jackett Server URL',
            settings.jackettServerUrl || '',
            (url) => settings.setJackettUrl(url.trim())
          )
        }
      />
      <SettingRow
        label="Telegram Account"
        value={settings.telegramSession ? `Connected as ${settings.telegramPhone}` : 'Not connected'}
        icon="paper-plane"
        onPress={() => {
          if (settings.telegramSession) {
            Alert.alert('Disconnect Telegram', 'Are you sure you want to disconnect?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => settings.logoutTelegram() }
            ]);
          } else {
            startTelegramAuth();
          }
        }}
      />

      {/* About */}
      <SectionHeader title="About" icon="information-circle" />
      <SettingRow
        label="Total Downloads"
        value={`${totalDownloads} files processed`}
        icon="analytics"
      />
      <SettingRow
        label="Open Source Libraries"
        icon="code-slash"
        onPress={() =>
          Alert.alert(
            'Powered By',
            'React Native · Expo · Zustand · yt-dlp · FFmpeg · Ionicons'
          )
        }
      />
      <SettingRow
        label="GitHub"
        value="View source code"
        icon="logo-github"
        onPress={() => Linking.openURL('https://github.com/nexload')}
      />
      <SettingRow
        label="Reset All Settings"
        icon="trash"
        onPress={() =>
          Alert.alert('Reset Settings', 'This will reset all settings to default.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: settings.resetToDefaults,
            },
          ])
        }
      />

      {/* Diagnostics */}
      <SectionHeader title="Diagnostics" icon="build" />
      <SettingRow
        label="Test Download"
        value="Download a 1MB test file"
        icon="flask"
        onPress={() => {
          Alert.alert(
            'Test Download',
            'This will download a 1MB test file to verify the download engine works.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Start Test',
                onPress: async () => {
                  try {
                    await downloadService.startDownload({
                      url: 'https://proof.ovh.net/files/1Mb.dat',
                      fileName: 'test_1MB.dat',
                    });
                    Alert.alert('✅ Test Started', 'Check the Downloads tab for progress!');
                  } catch (e: any) {
                    Alert.alert('❌ Test Failed', e.message);
                  }
                },
              },
            ]
          );
        }}
      />
      <SettingRow
        label="Download Engine"
        value="expo-file-system DownloadResumable"
        icon="hardware-chip"
      />

      {/* Edit URL Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
            <Text style={[typo.headline, { color: colors.text, marginBottom: spacing.md }]}>
              {editModalTitle}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderRadius: radii.md,
                  borderColor: colors.separator,
                  padding: spacing.md,
                },
              ]}
              value={editModalValue}
              onChangeText={setEditModalValue}
              placeholder="e.g. http://192.168.1.100:8000"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.bg, borderRadius: radii.md }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[typo.body, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent, borderRadius: radii.md }]}
                onPress={() => {
                  editModalOnSave?.(editModalValue);
                  setEditModalVisible(false);
                }}
              >
                <Text style={[typo.bodyBold, { color: '#FFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Telegram Auth Modal */}
      <Modal
        visible={telegramAuthStep !== 'idle'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTelegramAuthStep('idle')}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[typo.headline, { color: colors.text }]}>
                  {telegramAuthStep === 'phone' ? 'Connect Telegram' : 'Enter SMS Code'}
                </Text>
                <TouchableOpacity onPress={() => setTelegramAuthStep('idle')}>
                  <Icon name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <Text style={[typo.body, { color: colors.muted, marginBottom: spacing.md }]}>
                {telegramAuthStep === 'phone' 
                  ? 'Enter your phone number with country code (e.g. +1234567890).' 
                  : `Enter the code sent to ${telegramPhoneInput} via Telegram app or SMS.`}
              </Text>

              {telegramAuthStep === 'phone' ? (
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: colors.text, backgroundColor: colors.bg, borderColor: colors.separator },
                  ]}
                  value={telegramPhoneInput}
                  onChangeText={setTelegramPhoneInput}
                  placeholder="+1234567890"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  autoFocus
                  editable={!isAuthenticating}
                />
              ) : (
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: colors.text, backgroundColor: colors.bg, borderColor: colors.separator },
                  ]}
                  value={telegramCodeInput}
                  onChangeText={setTelegramCodeInput}
                  placeholder="12345"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  autoFocus
                  editable={!isAuthenticating}
                />
              )}

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent, opacity: isAuthenticating ? 0.6 : 1 }]}
                onPress={telegramAuthStep === 'phone' ? handleSendTelegramCode : handleVerifyTelegramCode}
                disabled={isAuthenticating}
              >
                <Text style={[typo.bodyBold, { color: '#FFF' }]}>
                  {isAuthenticating ? 'Please wait...' : telegramAuthStep === 'phone' ? 'Send Code' : 'Verify & Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Footer */}
      <View style={[styles.footer, { padding: spacing.xxl }]}>
        <Text style={[typo.caption2, { color: colors.muted, textAlign: 'center' }]}>
          NexLoad v1.0.0 Beta{'\n'}
          Made with ❤️ by Sonu Verma{'\n'}
          Zero-cost infrastructure
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appHeader: {
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  headerCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  headerCircle2: {
    width: 150,
    height: 150,
    bottom: -30,
    left: -30,
  },
  versionBadge: {},
  appIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeContainer: {},
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    padding: 24,
  },
  modalInput: {
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
