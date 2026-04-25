/**
 * Settings Screen
 * Theme toggle, download preferences, integrations, about
 */

import React, { useCallback } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settings.store';
import { ThemeToggle } from '../components/ThemeToggle';
import { useDownloadsStore } from '../store/downloads.store';

export const SettingsScreen: React.FC = () => {
  const { colors, radii, spacing, typography: typo } = useTheme();
  const settings = useSettingsStore();
  const totalDownloads = useDownloadsStore((s) => s.downloads.length);

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
            backgroundColor: colors.card,
            padding: spacing.xxl,
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={[
            styles.appIcon,
            {
              backgroundColor: colors.accent,
              borderRadius: radii.xl,
            },
          ]}
        >
          <Icon name="cloud-download" size={32} color="#FFFFFF" />
        </View>
        <Text style={[typo.title2, { color: colors.text, marginTop: spacing.md }]}>
          NexLoad
        </Text>
        <Text style={[typo.subheadline, { color: colors.muted, marginTop: spacing.xs }]}>
          Download Anything. At Full Speed.
        </Text>
        <Text style={[typo.caption2, { color: colors.muted, marginTop: spacing.xs }]}>
          Version 1.0.0 · Beta
        </Text>
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
          Alert.alert('yt-dlp Server', `Current: ${settings.ytdlpServerUrl || 'Default'}`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset to Default',
              onPress: () => settings.setYtdlpServerUrl('https://nexload-ytdlp.onrender.com'),
            },
          ])
        }
      />
      <SettingRow
        label="Jackett Server"
        value={settings.jackettServerUrl || 'Not configured'}
        icon="search-circle"
        onPress={() =>
          Alert.alert('Jackett', 'Configure Jackett server URL for 400+ indexers')
        }
      />
      <SettingRow
        label="Telegram API"
        value={settings.telegramApiId ? 'Configured ✓' : 'Not configured'}
        icon="paper-plane"
        onPress={() =>
          Alert.alert(
            'Telegram Configuration',
            'Enter your API ID and Hash from https://my.telegram.org',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open my.telegram.org',
                onPress: () => Linking.openURL('https://my.telegram.org'),
              },
            ]
          )
        }
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

      {/* Footer */}
      <View style={[styles.footer, { padding: spacing.xxl }]}>
        <Text style={[typo.caption2, { color: colors.muted, textAlign: 'center' }]}>
          NexLoad v1.0.0 Beta{'\n'}
          Built with ⚡ by NexLoad Team{'\n'}
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
  appHeader: {},
  appIcon: {
    width: 64,
    height: 64,
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
});
