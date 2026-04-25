/**
 * NexLoad yt-dlp Service
 * Communicates with the FastAPI backend for YouTube & social media downloads
 * Supports 1000+ sites via yt-dlp
 */

import axios, { AxiosError } from 'axios';
import { useSettingsStore } from '../store/settings.store';

export interface VideoFormat {
  format_id: string;
  ext: string;
  quality: string;
  filesize: number;
  resolution?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number; // seconds
  formats: VideoFormat[];
  uploader?: string;
  description?: string;
  webpage_url?: string;
}

export interface DirectUrl {
  direct_url: string;
  ext: string;
  title?: string;
  filesize?: number;
}

// Quality presets for user-facing selection
export const VIDEO_QUALITIES = [
  { label: '4K (2160p)', value: '2160', badge: '4K' },
  { label: '1440p', value: '1440', badge: 'QHD' },
  { label: '1080p', value: '1080', badge: 'FHD' },
  { label: '720p', value: '720', badge: 'HD' },
  { label: '360p', value: '360', badge: 'SD' },
  { label: '144p', value: '144', badge: 'LOW' },
  { label: 'Audio Only (MP3)', value: 'audio', badge: '🎵' },
] as const;

export const AUDIO_QUALITIES = [
  { label: 'FLAC (Lossless)', value: 'flac', bitrate: 'Lossless' },
  { label: '320 kbps', value: '320', bitrate: '320k' },
  { label: '192 kbps', value: '192', bitrate: '192k' },
  { label: '128 kbps', value: '128', bitrate: '128k' },
] as const;

const getBaseUrl = (): string => {
  return useSettingsStore.getState().ytdlpServerUrl || 'https://nexload-ytdlp.onrender.com';
};

const apiClient = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Retry interceptor with exponential backoff
apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as any;
  if (!config || config._retryCount >= 3) throw error;

  config._retryCount = (config._retryCount || 0) + 1;
  const delay = Math.pow(2, config._retryCount) * 1000;
  await new Promise((r) => setTimeout(r, delay));
  return apiClient(config);
});

/**
 * Fetch video info & available formats from a URL
 */
export const getVideoInfo = async (url: string): Promise<VideoInfo> => {
  const baseUrl = getBaseUrl();
  const { data } = await apiClient.get<VideoInfo>(`${baseUrl}/info`, {
    params: { url },
  });
  return data;
};

/**
 * Get a direct download URL for a specific format
 */
export const getDirectUrl = async (
  url: string,
  formatId: string = 'best'
): Promise<DirectUrl> => {
  const baseUrl = getBaseUrl();
  const { data } = await apiClient.get<DirectUrl>(`${baseUrl}/download-url`, {
    params: { url, format_id: formatId },
  });
  return data;
};

/**
 * Find the best format matching a quality preference
 */
export const findBestFormat = (
  formats: VideoFormat[],
  preferredQuality: string
): VideoFormat | null => {
  if (preferredQuality === 'audio') {
    // Find best audio-only format
    const audioFormats = formats.filter(
      (f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none')
    );
    return audioFormats.sort((a, b) => (b.filesize || 0) - (a.filesize || 0))[0] || null;
  }

  // Find best video format <= preferred resolution
  const targetRes = parseInt(preferredQuality);
  const videoFormats = formats.filter((f) => {
    const res = parseInt(f.quality) || 0;
    return res > 0 && res <= targetRes;
  });

  return videoFormats.sort((a, b) => {
    const resA = parseInt(a.quality) || 0;
    const resB = parseInt(b.quality) || 0;
    return resB - resA; // Highest resolution that fits
  })[0] || null;
};

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
