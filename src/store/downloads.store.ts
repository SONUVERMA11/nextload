/**
 * NexLoad Downloads Store (Zustand)
 * Manages download queue, progress tracking, and download lifecycle
 */

import { create } from 'zustand';

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'converting'
  | 'seeding';

export type LinkType =
  | 'youtube'
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'facebook'
  | 'reddit'
  | 'vimeo'
  | 'dailymotion'
  | 'magnet'
  | 'torrent'
  | 'telegram'
  | 'direct';

export interface DownloadItem {
  id: string;
  url: string;
  fileName: string;
  fileSize: number; // bytes, 0 if unknown
  downloadedBytes: number;
  status: DownloadStatus;
  linkType: LinkType;
  speed: number; // bytes/sec
  eta: number; // seconds remaining
  progress: number; // 0-100
  createdAt: number; // timestamp
  completedAt?: number;
  filePath?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  // Torrent-specific
  seeds?: number;
  peers?: number;
  ratio?: number;
  // Video-specific
  quality?: string;
  thumbnail?: string;
  title?: string;
  // Audio extraction
  isAudioExtraction?: boolean;
  audioQuality?: '128' | '192' | '320' | 'flac';
}

interface DownloadsState {
  downloads: DownloadItem[];
  maxConcurrent: number;

  // Actions
  addDownload: (download: Omit<DownloadItem, 'id' | 'createdAt' | 'retryCount' | 'maxRetries' | 'status' | 'downloadedBytes' | 'speed' | 'eta' | 'progress'>) => string;
  removeDownload: (id: string) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  reorderDownload: (fromIndex: number, toIndex: number) => void;
  clearCompleted: () => void;
  setMaxConcurrent: (max: number) => void;

  // Selectors
  getActiveDownloads: () => DownloadItem[];
  getCompletedDownloads: () => DownloadItem[];
  getQueuedDownloads: () => DownloadItem[];
  getTotalSpeed: () => number;
  getActiveCount: () => number;
}

const generateId = (): string =>
  `dl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  maxConcurrent: 3,

  addDownload: (download) => {
    const id = generateId();
    const newItem: DownloadItem = {
      ...download,
      id,
      status: 'queued',
      downloadedBytes: 0,
      speed: 0,
      eta: 0,
      progress: 0,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };

    set((state) => ({
      downloads: [newItem, ...state.downloads],
    }));

    return id;
  },

  removeDownload: (id) => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
    }));
  },

  updateDownload: (id, updates) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  },

  pauseDownload: (id) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id && d.status === 'downloading'
          ? { ...d, status: 'paused' as DownloadStatus, speed: 0, eta: 0 }
          : d
      ),
    }));
  },

  resumeDownload: (id) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id && (d.status === 'paused' || d.status === 'failed')
          ? { ...d, status: 'queued' as DownloadStatus }
          : d
      ),
    }));
  },

  cancelDownload: (id) => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
    }));
  },

  retryDownload: (id) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id && d.status === 'failed'
          ? {
              ...d,
              status: 'queued' as DownloadStatus,
              retryCount: d.retryCount + 1,
              error: undefined,
              downloadedBytes: 0,
              progress: 0,
              speed: 0,
              eta: 0,
            }
          : d
      ),
    }));
  },

  reorderDownload: (fromIndex, toIndex) => {
    set((state) => {
      const downloads = [...state.downloads];
      const [moved] = downloads.splice(fromIndex, 1);
      downloads.splice(toIndex, 0, moved);
      return { downloads };
    });
  },

  clearCompleted: () => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.status !== 'completed'),
    }));
  },

  setMaxConcurrent: (max) => {
    set({ maxConcurrent: Math.min(Math.max(max, 1), 8) });
  },

  // Selectors
  getActiveDownloads: () =>
    get().downloads.filter((d) => d.status === 'downloading' || d.status === 'converting'),

  getCompletedDownloads: () =>
    get().downloads.filter((d) => d.status === 'completed'),

  getQueuedDownloads: () =>
    get().downloads.filter((d) => d.status === 'queued'),

  getTotalSpeed: () =>
    get()
      .downloads.filter((d) => d.status === 'downloading')
      .reduce((sum, d) => sum + d.speed, 0),

  getActiveCount: () =>
    get().downloads.filter((d) => d.status === 'downloading').length,
}));
