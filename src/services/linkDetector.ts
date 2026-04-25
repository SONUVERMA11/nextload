/**
 * NexLoad Link Detector Service
 * Re-exports utils/linkDetector with additional service-layer logic
 */

export { detectLink, isValidUrl, supportsQualitySelection } from '../utils/linkDetector';
export type { LinkType } from '../utils/linkDetector';

/**
 * Get the appropriate icon name for a link type (Ionicons)
 */
export const getLinkTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    youtube: 'logo-youtube',
    instagram: 'logo-instagram',
    twitter: 'logo-twitter',
    tiktok: 'musical-notes',
    facebook: 'logo-facebook',
    reddit: 'logo-reddit',
    vimeo: 'logo-vimeo',
    dailymotion: 'play-circle',
    magnet: 'magnet',
    torrent: 'cloud-download',
    telegram: 'paper-plane',
    direct: 'download',
  };
  return icons[type] || 'download';
};

/**
 * Get a display color for a link type
 */
export const getLinkTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    youtube: '#FF0000',
    instagram: '#E4405F',
    twitter: '#1DA1F2',
    tiktok: '#010101',
    facebook: '#1877F2',
    reddit: '#FF4500',
    vimeo: '#1AB7EA',
    dailymotion: '#0066DC',
    magnet: '#FF6B35',
    torrent: '#FF6B35',
    telegram: '#0088CC',
    direct: '#185FA5',
  };
  return colors[type] || '#185FA5';
};
