/**
 * NexLoad Unified Download Service
 * Routes downloads to the appropriate engine based on link type
 * Manages download queue, concurrency, retry logic
 */

import { useDownloadsStore, DownloadItem, DownloadStatus, LinkType } from '../store/downloads.store';
import { useSettingsStore } from '../store/settings.store';
import { detectLink } from '../utils/linkDetector';
import * as ytdlpService from './ytdlp.service';
import * as torrentService from './torrent.service';
import * as telegramService from './telegram.service';

export interface DownloadRequest {
  url: string;
  fileName?: string;
  quality?: string;
  audioQuality?: '128' | '192' | '320' | 'flac';
  isAudioExtraction?: boolean;
  savePath?: string;
}

// Active download controllers (for cancellation)
const activeControllers = new Map<string, AbortController>();

/**
 * Start a download by routing to the appropriate service
 */
export const startDownload = async (request: DownloadRequest): Promise<string> => {
  const { type } = detectLink(request.url);
  const store = useDownloadsStore.getState();
  const settings = useSettingsStore.getState();

  // Determine file name
  let fileName = request.fileName || extractFileName(request.url, type);

  // Add to store
  const id = store.addDownload({
    url: request.url,
    fileName,
    fileSize: 0,
    linkType: type as LinkType,
    quality: request.quality,
    isAudioExtraction: request.isAudioExtraction,
    audioQuality: request.audioQuality,
  });

  // Check concurrent limit
  const activeCount = store.getActiveCount();
  if (activeCount >= settings.maxConcurrentDownloads) {
    // Stay queued, will be picked up when a slot opens
    return id;
  }

  // Route to appropriate download engine
  processDownload(id, request, type as LinkType);

  return id;
};

/**
 * Process a download by its type
 */
const processDownload = async (
  id: string,
  request: DownloadRequest,
  type: LinkType
): Promise<void> => {
  const store = useDownloadsStore.getState();
  const controller = new AbortController();
  activeControllers.set(id, controller);

  store.updateDownload(id, { status: 'downloading' });

  try {
    switch (type) {
      case 'youtube':
      case 'instagram':
      case 'twitter':
      case 'tiktok':
      case 'facebook':
      case 'reddit':
      case 'vimeo':
      case 'dailymotion':
        await handleVideoDownload(id, request, controller.signal);
        break;

      case 'magnet':
        await handleMagnetDownload(id, request);
        break;

      case 'torrent':
        await handleTorrentFileDownload(id, request);
        break;

      case 'telegram':
        await handleTelegramDownload(id, request, controller.signal);
        break;

      case 'direct':
      default:
        await handleDirectDownload(id, request, controller.signal);
        break;
    }

    // Mark as completed
    store.updateDownload(id, {
      status: 'completed',
      progress: 100,
      completedAt: Date.now(),
      speed: 0,
      eta: 0,
    });
  } catch (error: any) {
    if (controller.signal.aborted) return; // Cancelled by user

    const currentItem = store.downloads.find((d) => d.id === id);
    if (currentItem && currentItem.retryCount < currentItem.maxRetries) {
      // Auto-retry with exponential backoff
      const delay = Math.pow(2, currentItem.retryCount + 1) * 1000;
      store.updateDownload(id, {
        status: 'queued',
        retryCount: currentItem.retryCount + 1,
        error: error.message,
      });

      setTimeout(() => {
        const item = useDownloadsStore.getState().downloads.find((d) => d.id === id);
        if (item && item.status === 'queued') {
          processDownload(id, request, type);
        }
      }, delay);
    } else {
      store.updateDownload(id, {
        status: 'failed',
        error: error.message || 'Download failed',
        speed: 0,
        eta: 0,
      });
    }
  } finally {
    activeControllers.delete(id);
    // Check queue for next download
    processQueue();
  }
};

/**
 * Handle video platform downloads via yt-dlp backend
 */
const handleVideoDownload = async (
  id: string,
  request: DownloadRequest,
  signal: AbortSignal
): Promise<void> => {
  const store = useDownloadsStore.getState();

  // Get video info
  const info = await ytdlpService.getVideoInfo(request.url);
  store.updateDownload(id, {
    fileName: `${sanitizeFileName(info.title)}.mp4`,
    title: info.title,
    thumbnail: info.thumbnail,
  });

  // Get direct URL for requested quality
  const formatId = request.quality || 'best';
  const directUrl = await ytdlpService.getDirectUrl(request.url, formatId);

  store.updateDownload(id, {
    fileName: `${sanitizeFileName(info.title)}.${directUrl.ext}`,
  });

  // TODO: Download via react-native-background-downloader
  // const task = RNBackgroundDownloader.download({
  //   id,
  //   url: directUrl.direct_url,
  //   destination: `${savePath}/${fileName}`,
  // });
  // task.progress((percent, bytes, total) => { ... });
  // task.done(() => { ... });
  // task.error((error) => { ... });

  console.log(`[Download] Video download started: ${info.title}`);
};

/**
 * Handle magnet link downloads via torrent engine
 */
const handleMagnetDownload = async (id: string, request: DownloadRequest): Promise<void> => {
  const infoHash = await torrentService.addMagnet(request.url);
  const store = useDownloadsStore.getState();
  store.updateDownload(id, { fileName: `Torrent: ${infoHash.substring(0, 12)}...` });
  console.log(`[Download] Magnet added: ${infoHash}`);
};

/**
 * Handle .torrent file downloads
 */
const handleTorrentFileDownload = async (id: string, request: DownloadRequest): Promise<void> => {
  // First download the .torrent file, then add it
  console.log(`[Download] Torrent file download: ${request.url}`);
  // TODO: Download .torrent file, then call torrentService.addTorrentFile()
};

/**
 * Handle Telegram file downloads
 */
const handleTelegramDownload = async (
  id: string,
  request: DownloadRequest,
  signal: AbortSignal
): Promise<void> => {
  const store = useDownloadsStore.getState();
  const settings = useSettingsStore.getState();
  const savePath = settings.downloadPath;

  await telegramService.downloadFile(
    request.url,
    `${savePath}/${request.fileName || 'telegram_file'}`,
    (progress) => {
      store.updateDownload(id, {
        downloadedBytes: progress.downloaded,
        fileSize: progress.total,
        progress: progress.percentage,
      });
    }
  );
};

/**
 * Handle direct HTTP/HTTPS file downloads
 */
const handleDirectDownload = async (
  id: string,
  request: DownloadRequest,
  signal: AbortSignal
): Promise<void> => {
  console.log(`[Download] Direct download: ${request.url}`);

  // TODO: Use react-native-background-downloader for chunked, resumable downloads
  // const task = RNBackgroundDownloader.download({
  //   id,
  //   url: request.url,
  //   destination: `${savePath}/${fileName}`,
  //   headers: {},
  // });
};

/**
 * Process queued downloads when slots become available
 */
const processQueue = (): void => {
  const store = useDownloadsStore.getState();
  const settings = useSettingsStore.getState();
  const activeCount = store.getActiveCount();
  const available = settings.maxConcurrentDownloads - activeCount;

  if (available <= 0) return;

  const queued = store.getQueuedDownloads();
  queued.slice(0, available).forEach((item) => {
    processDownload(item.id, { url: item.url, quality: item.quality }, item.linkType);
  });
};

/**
 * Cancel a download
 */
export const cancelDownload = (id: string): void => {
  const controller = activeControllers.get(id);
  if (controller) {
    controller.abort();
    activeControllers.delete(id);
  }
  useDownloadsStore.getState().cancelDownload(id);
  processQueue();
};

/**
 * Pause a download
 */
export const pauseDownload = (id: string): void => {
  const controller = activeControllers.get(id);
  if (controller) {
    controller.abort();
    activeControllers.delete(id);
  }
  useDownloadsStore.getState().pauseDownload(id);
};

/**
 * Resume a download
 */
export const resumeDownload = (id: string): void => {
  const store = useDownloadsStore.getState();
  const item = store.downloads.find((d) => d.id === id);
  if (item) {
    store.resumeDownload(id);
    processQueue();
  }
};

/**
 * Add multiple URLs for batch download
 */
export const batchDownload = async (urls: string[]): Promise<string[]> => {
  const ids: string[] = [];
  for (const url of urls) {
    if (url.trim()) {
      const id = await startDownload({ url: url.trim() });
      ids.push(id);
    }
  }
  return ids;
};

// ─── Helpers ────────────────────────────────────────────────────────────

const extractFileName = (url: string, type: string): string => {
  try {
    if (type === 'magnet') return 'Torrent Download';
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'download';
    return decodeURIComponent(lastSegment);
  } catch {
    return `download_${Date.now()}`;
  }
};

const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
};
