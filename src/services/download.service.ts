/**
 * NexLoad Unified Download Service
 * Real file downloads using expo-file-system DownloadResumable
 * with progress tracking, speed calculation, pause/resume support
 */

import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import { useDownloadsStore, LinkType } from '../store/downloads.store';
import { useSettingsStore } from '../store/settings.store';
import { detectLink } from '../utils/linkDetector';

export interface DownloadRequest {
  url: string;
  fileName?: string;
  quality?: string;
  audioQuality?: '128' | '192' | '320' | 'flac';
  isAudioExtraction?: boolean;
  savePath?: string;
}

// Active downloads for pause/cancel
const activeResumables = new Map<string, FileSystem.DownloadResumable>();
// Saved pause snapshots for resume support
const pauseSnapshots = new Map<string, FileSystem.DownloadPauseState>();
// Last known speed per download (prevents flicker to 0)
const lastKnownSpeed = new Map<string, number>();

// ─── Ensure download directory exists ──────────────────────────────────

const ensureDownloadDir = async (): Promise<string> => {
  const dir = `${FileSystem.documentDirectory}downloads/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
};

// ─── Public API ────────────────────────────────────────────────────────

export const startDownload = async (request: DownloadRequest): Promise<string> => {
  const { type } = detectLink(request.url);
  const store = useDownloadsStore.getState();
  const settings = useSettingsStore.getState();

  const fileName = request.fileName || extractFileName(request.url, type);

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
    return id; // Stay queued
  }

  // Fire and forget — processDownload handles its own errors
  processDownload(id, request, type as LinkType);
  return id;
};

export const cancelDownload = (id: string): void => {
  const resumable = activeResumables.get(id);
  if (resumable) {
    try { resumable.pauseAsync(); } catch {}
    activeResumables.delete(id);
  }
  useDownloadsStore.getState().cancelDownload(id);
  processQueue();
};

export const pauseDownload = async (id: string): Promise<void> => {
  const resumable = activeResumables.get(id);
  if (resumable) {
    try {
      const snapshot = await resumable.pauseAsync();
      if (snapshot) {
        pauseSnapshots.set(id, snapshot);
      }
    } catch {}
  }
  useDownloadsStore.getState().pauseDownload(id);
};

export const resumeDownload = async (id: string): Promise<void> => {
  const store = useDownloadsStore.getState();
  const item = store.downloads.find((d) => d.id === id);
  if (!item) return;

  store.resumeDownload(id);

  // If we have a saved snapshot + resumable, resume from where we left off
  const snapshot = pauseSnapshots.get(id);
  const resumable = activeResumables.get(id);
  if (resumable && snapshot) {
    pauseSnapshots.delete(id);
    store.updateDownload(id, { status: 'downloading', error: undefined });
    try {
      const result = await resumable.resumeAsync();
      if (result && result.status < 400) {
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSize = (fileInfo as any).size || 0;
        useDownloadsStore.getState().updateDownload(id, {
          status: 'completed',
          progress: 100,
          downloadedBytes: fileSize,
          fileSize: fileSize,
          filePath: result.uri,
          completedAt: Date.now(),
          speed: 0,
          eta: 0,
          error: undefined,
        });
      }
    } catch (e: any) {
      useDownloadsStore.getState().updateDownload(id, {
        status: 'failed',
        error: e?.message || 'Resume failed',
        speed: 0,
        eta: 0,
      });
    } finally {
      activeResumables.delete(id);
      lastKnownSpeed.delete(id);
      processQueue();
    }
    return;
  }

  // No snapshot — fall through to queue which will restart
  processQueue();
};

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

// ─── Internal: Download Router ─────────────────────────────────────────

const processDownload = async (
  id: string,
  request: DownloadRequest,
  type: LinkType
): Promise<void> => {
  const store = useDownloadsStore.getState();
  store.updateDownload(id, { status: 'downloading', error: undefined });

  try {
    if (type === 'magnet' || type === 'torrent') {
      // Route through backend torrent engine
      await handleTorrentDownload(id, request);
    } else if (type === 'telegram') {
      // Telegram links need backend TelegramClient using stored session
      await handleTelegramDownload(id, request);
    } else if (type === 'youtube' || type === 'instagram' || type === 'twitter' ||
        type === 'tiktok' || type === 'facebook' || type === 'reddit' ||
        type === 'vimeo' || type === 'dailymotion') {
      // Video platforms need yt-dlp backend
      await handleVideoDownload(id, request);
    } else {
      // Direct HTTP download (the most common case)
      await downloadFileWithProgress(id, request.url, request.fileName);
    }

  } catch (error: any) {
    const msg = error?.message || 'Unknown download error';
    console.error(`[NexLoad] Download ${id} failed:`, msg);

    const currentItem = useDownloadsStore.getState().downloads.find((d) => d.id === id);
    if (!currentItem || currentItem.status === 'paused') return;

    if (currentItem.retryCount < currentItem.maxRetries) {
      const delay = Math.pow(2, currentItem.retryCount + 1) * 1000;
      store.updateDownload(id, {
        status: 'queued',
        retryCount: currentItem.retryCount + 1,
        error: `Retrying... (${msg})`,
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
        error: msg,
        speed: 0,
        eta: 0,
      });
    }
  } finally {
    activeResumables.delete(id);
    processQueue();
  }
};

// ─── Core: Direct File Download with Progress ──────────────────────────

const downloadFileWithProgress = async (
  id: string,
  url: string,
  overrideFileName?: string
): Promise<void> => {
  const store = useDownloadsStore.getState();
  const dir = await ensureDownloadDir();

  // Determine filename
  const item = store.downloads.find((d) => d.id === id);
  let fileName = overrideFileName || item?.fileName || `download_${Date.now()}.bin`;
  fileName = sanitizeFileName(fileName);
  const fileUri = `${dir}${fileName}`;

  console.log(`[NexLoad] Downloading: ${url}`);
  console.log(`[NexLoad] Saving to: ${fileUri}`);

  // Update store with the save path
  useDownloadsStore.getState().updateDownload(id, {
    filePath: fileUri,
    error: undefined,
  });

  // Speed tracking
  let lastBytes = 0;
  let lastTime = Date.now();

  const onProgress = (data: FileSystem.DownloadProgressData) => {
    const { totalBytesWritten, totalBytesExpectedToWrite } = data;
    const now = Date.now();
    const elapsed = (now - lastTime) / 1000;

    // Only recalculate speed when enough time has passed (avoids flicker to 0)
    let speed = lastKnownSpeed.get(id) || 0;
    if (elapsed >= 0.5) {
      speed = Math.round((totalBytesWritten - lastBytes) / elapsed);
      lastBytes = totalBytesWritten;
      lastTime = now;
      lastKnownSpeed.set(id, speed);
    }

    const progress = totalBytesExpectedToWrite > 0
      ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
      : 0;

    const remaining = totalBytesExpectedToWrite - totalBytesWritten;
    const eta = speed > 0 ? Math.round(remaining / speed) : 0;

    useDownloadsStore.getState().updateDownload(id, {
      downloadedBytes: totalBytesWritten,
      fileSize: totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : 0,
      progress: Math.min(progress, 99), // Don't show 100% until verified
      speed,
      eta,
    });
  };

  // Create the download
  const resumable = FileSystem.createDownloadResumable(
    url,
    fileUri,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': '*/*',
      },
    },
    onProgress
  );

  activeResumables.set(id, resumable);

  // Execute download
  const result = await resumable.downloadAsync();

  if (!result) {
    throw new Error('Download returned null — was it cancelled?');
  }

  // Check HTTP status
  if (result.status >= 400) {
    // Clean up bad file
    try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch {}
    throw new Error(`Server returned HTTP ${result.status}. The URL may be invalid or expired.`);
  }

  // Verify the file
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error('File was not saved to disk');
  }

  const fileSize = (fileInfo as any).size || 0;
  if (fileSize === 0) {
    try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch {}
    throw new Error('Downloaded file is 0 bytes — the link may be broken');
  }

  // ✅ Success!
  useDownloadsStore.getState().updateDownload(id, {
    status: 'completed',
    progress: 100,
    downloadedBytes: fileSize,
    fileSize: fileSize,
    filePath: fileUri,
    completedAt: Date.now(),
    speed: 0,
    eta: 0,
    error: undefined,
  });

  console.log(`[NexLoad] ✅ Download complete: ${fileName} (${fileSize} bytes)`);
  lastKnownSpeed.delete(id);
};

// ─── Video Download (yt-dlp) ───────────────────────────────────────────

const handleVideoDownload = async (
  id: string,
  request: DownloadRequest
): Promise<void> => {
  const store = useDownloadsStore.getState();
  const settings = useSettingsStore.getState();
  const serverUrl = settings.ytdlpServerUrl || 'https://nexload-ytdlp.onrender.com';

  // Step 1: Get video info
  store.updateDownload(id, { error: 'Fetching video info...' });

  let info: any;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(`${serverUrl}/info?url=${encodeURIComponent(request.url)}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
      throw new Error(err.detail || `Server returned ${resp.status}`);
    }
    info = await resp.json();
  } catch (e: any) {
    const msg = e.name === 'AbortError' ? 'Request timed out (15s)' : e.message;
    throw new Error(`yt-dlp error: ${msg}. Try testing on a local residential network if YouTube blocks the cloud server.`);
  }

  store.updateDownload(id, {
    fileName: `${sanitizeFileName(info.title || 'video')}.mp4`,
    title: info.title,
    thumbnail: info.thumbnail,
    error: undefined,
  });

  let ytFormatStr = 'best';
  if (request.quality === 'audio') {
    ytFormatStr = 'bestaudio[ext=m4a]/bestaudio/best';
  } else if (request.quality && request.quality !== 'best') {
    ytFormatStr = `best[height<=${request.quality}]/best`;
  }
  
  // Step 2: Get direct download URL
  store.updateDownload(id, { error: 'Resolving download URL...' });

  let directUrl: any;
  try {
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 15000);
    const resp = await fetch(
      `${serverUrl}/download-url?url=${encodeURIComponent(request.url)}&format_id=${encodeURIComponent(ytFormatStr)}`,
      { headers: { 'Content-Type': 'application/json' }, signal: controller2.signal }
    );
    clearTimeout(timeout2);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
      throw new Error(err.detail || `Server returned ${resp.status}`);
    }
    directUrl = await resp.json();
  } catch (e: any) {
    const msg = e.name === 'AbortError' ? 'Request timed out (15s)' : e.message;
    throw new Error(`Failed to resolve download URL: ${msg}`);
  }

  if (!directUrl?.direct_url) {
    throw new Error('yt-dlp server did not return a download URL');
  }

  const ext = directUrl.ext || 'mp4';
  const fileName = `${sanitizeFileName(info.title || 'video')}.${ext}`;
  store.updateDownload(id, { fileName, error: undefined });

  // Step 3: Download the actual file
  await downloadFileWithProgress(id, directUrl.direct_url, fileName);
};

// ─── Telegram Download (via backend) ───────────────────────────────────

const handleTelegramDownload = async (
  id: string,
  request: DownloadRequest
): Promise<void> => {
  const store = useDownloadsStore.getState();
  const settings = useSettingsStore.getState();
  const serverUrl = settings.ytdlpServerUrl || 'https://nexload-ytdlp.onrender.com';
  
  if (!settings.telegramSession) {
    throw new Error('Telegram account not connected. Please connect in Settings > Telegram.');
  }

  store.updateDownload(id, { error: 'Resolving Telegram message...' });

  let info: any;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(`${serverUrl}/telegram/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: request.url, session_string: settings.telegramSession }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      if (resp.status === 401) {
        settings.logoutTelegram(); // Session expired
        throw new Error('Telegram session expired. Please reconnect in Settings.');
      }
      const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
      throw new Error(err.detail || `Server returned ${resp.status}`);
    }
    info = await resp.json();
  } catch (e: any) {
    const msg = e.name === 'AbortError' ? 'Request timed out' : e.message;
    throw new Error(`Telegram error: ${msg}`);
  }

  store.updateDownload(id, {
    fileName: info.file_name,
    title: info.file_name,
    fileSize: info.file_size || 0,
    error: undefined,
  });

  store.updateDownload(id, { error: 'Downloading file from Telegram server...' });

  // File is ready on the backend, now we download it to the device using our resumable logic
  // We'll pass the session_string and url as query params
  const fileUrl = `${serverUrl}/telegram/download?url=${encodeURIComponent(request.url)}&session_string=${encodeURIComponent(settings.telegramSession)}&save_name=${encodeURIComponent(info.file_name)}`;
  const fileName = `${sanitizeFileName(info.file_name)}`;
  
  store.updateDownload(id, { error: undefined });
  
  await downloadFileWithProgress(id, fileUrl, fileName);
};

// ─── Torrent Download (via backend) ────────────────────────────────────

const handleTorrentDownload = async (
  id: string,
  request: DownloadRequest
): Promise<void> => {
  const store = useDownloadsStore.getState();
  const settings = useSettingsStore.getState();
  const serverUrl = settings.ytdlpServerUrl || 'https://nexload-ytdlp.onrender.com';

  // Step 1: Add torrent to backend engine
  store.updateDownload(id, { error: 'Sending to torrent engine...' });

  let torrentInfo: any;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 30s metadata + 5s buffer
    const resp = await fetch(`${serverUrl}/torrent/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magnet: request.url }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
      throw new Error(err.detail || `Server returned ${resp.status}`);
    }
    torrentInfo = await resp.json();
  } catch (e: any) {
    const msg = e.name === 'AbortError' ? 'Timed out waiting for torrent metadata' : e.message;
    throw new Error(`Torrent engine error: ${msg}. Check server URL in Settings > Integrations.`);
  }

  const torrentId = torrentInfo.id;
  const torrentName = torrentInfo.name || 'torrent_download';

  store.updateDownload(id, {
    fileName: torrentName,
    title: torrentName,
    fileSize: torrentInfo.total_size || 0,
    error: undefined,
  });

  // Step 2: Poll for progress until complete
  let completed = false;
  while (!completed) {
    // Check if download was cancelled/paused
    const currentItem = useDownloadsStore.getState().downloads.find((d) => d.id === id);
    if (!currentItem || currentItem.status === 'paused' || currentItem.status === 'failed') {
      return;
    }

    await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s

    try {
      const statusResp = await fetch(`${serverUrl}/torrent/status/${torrentId}`);
      if (!statusResp.ok) throw new Error(`Status check failed`);
      const status = await statusResp.json();

      useDownloadsStore.getState().updateDownload(id, {
        progress: Math.min(Math.round(status.progress), 99),
        speed: status.download_rate || 0,
        eta: status.eta || 0,
        downloadedBytes: status.downloaded || 0,
        fileSize: status.total_size || 0,
        seeds: status.num_seeds,
        peers: status.num_peers,
        error: undefined,
      });

      if (status.state === 'finished' || status.state === 'seeding' || status.progress >= 100) {
        completed = true;
      }
    } catch {
      // Transient polling error — keep trying
    }
  }

  // Step 3: Download completed file from backend
  store.updateDownload(id, { error: 'Transferring file from server...' });

  const fileUrl = `${serverUrl}/torrent/download/${torrentId}?file_index=0`;
  const fileName = `${sanitizeFileName(torrentName)}`;
  store.updateDownload(id, { error: undefined });

  await downloadFileWithProgress(id, fileUrl, fileName);
};

// ─── Queue Management ──────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────

const extractFileName = (url: string, type: string): string => {
  try {
    if (type === 'magnet') {
      const nameMatch = url.match(/dn=([^&]+)/);
      if (nameMatch) return decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ');
      return 'Torrent Download';
    }
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'download';
    const decoded = decodeURIComponent(lastSegment);
    // Ensure a file extension
    if (!decoded.includes('.')) {
      return `${decoded}.bin`;
    }
    return decoded;
  } catch {
    return `download_${Date.now()}.bin`;
  }
};

const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .trim()
    .substring(0, 200);
};
