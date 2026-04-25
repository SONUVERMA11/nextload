/**
 * Format byte size to human-readable string
 * e.g., 1536 → "1.5 KB", 1073741824 → "1.00 GB"
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Unknown';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
};

/**
 * Parse human-readable size string back to bytes
 * e.g., "1.5 GB" → 1610612736
 */
export const parseBytes = (sizeStr: string): number => {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5,
  };

  return Math.round(value * (multipliers[unit] || 1));
};
