/**
 * Format download speed to human-readable string
 * e.g., 1048576 → "1.00 MB/s"
 */
export const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond <= 0) return '0 B/s';

  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  const value = bytesPerSecond / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : 2)} ${sizes[Math.min(i, sizes.length - 1)]}`;
};

/**
 * Format seconds to human-readable ETA
 * e.g., 3661 → "1h 1m", 45 → "45s"
 */
export const formatETA = (seconds: number): string => {
  if (seconds <= 0 || !isFinite(seconds)) return '∞';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

/**
 * Format elapsed time since timestamp
 */
export const formatTimeAgo = (timestamp: number): string => {
  const diff = Math.floor((Date.now() - timestamp) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};
