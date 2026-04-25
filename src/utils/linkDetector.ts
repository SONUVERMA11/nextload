/**
 * Link Type Detector (Utils)
 * Auto-detect URL type for routing to appropriate download service
 */

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

interface LinkDetection {
  type: LinkType;
  label: string;
  icon: string; // Ionicons name
  color: string;
}

const LINK_PATTERNS: Array<{ pattern: RegExp; type: LinkType; label: string; icon: string; color: string }> = [
  { pattern: /^magnet:\?/i, type: 'magnet', label: 'Magnet Link', icon: 'magnet-outline', color: '#FF6B35' },
  { pattern: /\.torrent(\?|$)/i, type: 'torrent', label: 'Torrent File', icon: 'cloud-download-outline', color: '#FF6B35' },
  { pattern: /t\.me\/|telegram\.me\//i, type: 'telegram', label: 'Telegram', icon: 'paper-plane-outline', color: '#0088CC' },
  { pattern: /youtube\.com\/|youtu\.be\//i, type: 'youtube', label: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  { pattern: /instagram\.com\//i, type: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { pattern: /twitter\.com\/|x\.com\//i, type: 'twitter', label: 'Twitter / X', icon: 'logo-twitter', color: '#1DA1F2' },
  { pattern: /tiktok\.com\//i, type: 'tiktok', label: 'TikTok', icon: 'musical-notes-outline', color: '#000000' },
  { pattern: /facebook\.com\/|fb\.watch\//i, type: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { pattern: /reddit\.com\//i, type: 'reddit', label: 'Reddit', icon: 'logo-reddit', color: '#FF4500' },
  { pattern: /vimeo\.com\//i, type: 'vimeo', label: 'Vimeo', icon: 'logo-vimeo', color: '#1AB7EA' },
  { pattern: /dailymotion\.com\//i, type: 'dailymotion', label: 'Dailymotion', icon: 'play-circle-outline', color: '#0066DC' },
];

/**
 * Detect the type of a given URL/link
 */
export const detectLink = (url: string): LinkDetection => {
  const trimmed = url.trim();

  for (const { pattern, type, label, icon, color } of LINK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type, label, icon, color };
    }
  }

  return {
    type: 'direct',
    label: 'Direct Download',
    icon: 'download-outline',
    color: '#185FA5',
  };
};

/**
 * Check if a string is a valid URL
 */
export const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'magnet:';
  } catch {
    return false;
  }
};

/**
 * Check if the link type supports quality selection
 */
export const supportsQualitySelection = (type: LinkType): boolean => {
  return ['youtube', 'instagram', 'twitter', 'tiktok', 'facebook', 'reddit', 'vimeo', 'dailymotion'].includes(type);
};
