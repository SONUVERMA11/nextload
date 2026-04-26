/**
 * NexLoad Settings Store (Zustand)
 * App preferences persisted via MMKV
 */

import { create } from 'zustand';
import { ThemeMode } from '../theme/ThemeProvider';

interface SettingsState {
  // Appearance
  themeMode: ThemeMode;

  // Downloads
  downloadPath: string;
  maxConcurrentDownloads: number;
  speedLimitEnabled: boolean;
  speedLimitKbps: number;
  autoRetryEnabled: boolean;
  maxRetries: number;

  // Notifications
  showDownloadProgress: boolean;
  showCompletionAlert: boolean;
  vibrateOnComplete: boolean;

  // Integrations
  jackettServerUrl: string;
  ytdlpServerUrl: string;
  telegramSession: string;
  telegramPhone: string;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setDownloadPath: (path: string) => void;
  setMaxConcurrentDownloads: (max: number) => void;
  setSpeedLimit: (enabled: boolean, kbps?: number) => void;
  setAutoRetry: (enabled: boolean, maxRetries?: number) => void;
  setNotificationPrefs: (prefs: Partial<Pick<SettingsState, 'showDownloadProgress' | 'showCompletionAlert' | 'vibrateOnComplete'>>) => void;
  setJackettUrl: (url: string) => void;
  setYtdlpServerUrl: (url: string) => void;
  setTelegramAuth: (session: string, phone: string) => void;
  logoutTelegram: () => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS = {
  themeMode: 'system' as ThemeMode,
  downloadPath: '/storage/emulated/0/Download/NexLoad',
  maxConcurrentDownloads: 3,
  speedLimitEnabled: false,
  speedLimitKbps: 0,
  autoRetryEnabled: true,
  maxRetries: 3,
  showDownloadProgress: true,
  showCompletionAlert: true,
  vibrateOnComplete: true,
  jackettServerUrl: '',
  ytdlpServerUrl: 'https://nexload-ytdlp.onrender.com',
  telegramSession: '',
  telegramPhone: '',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,

  setThemeMode: (themeMode) => set({ themeMode }),

  setDownloadPath: (downloadPath) => set({ downloadPath }),

  setMaxConcurrentDownloads: (max) =>
    set({ maxConcurrentDownloads: Math.min(Math.max(max, 1), 8) }),

  setSpeedLimit: (enabled, kbps) =>
    set((state) => ({
      speedLimitEnabled: enabled,
      speedLimitKbps: kbps ?? state.speedLimitKbps,
    })),

  setAutoRetry: (enabled, maxRetries) =>
    set((state) => ({
      autoRetryEnabled: enabled,
      maxRetries: maxRetries ?? state.maxRetries,
    })),

  setNotificationPrefs: (prefs) => set((state) => ({ ...state, ...prefs })),

  setJackettUrl: (jackettServerUrl) => set({ jackettServerUrl }),

  setYtdlpServerUrl: (ytdlpServerUrl) => set({ ytdlpServerUrl }),

  setTelegramAuth: (telegramSession, telegramPhone) =>
    set({ telegramSession, telegramPhone }),

  logoutTelegram: () => set({ telegramSession: '', telegramPhone: '' }),

  resetToDefaults: () => set(DEFAULT_SETTINGS),
}));
