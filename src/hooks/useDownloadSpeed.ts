/**
 * Download Speed Hook
 * Calculates real-time aggregate download speed from all active downloads
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useDownloadsStore } from '../store/downloads.store';
import { formatSpeed } from '../utils/formatSpeed';
import { formatBytes } from '../utils/formatBytes';

interface SpeedMetrics {
  currentSpeed: number; // bytes/sec
  formattedSpeed: string;
  totalDownloaded: number; // bytes
  formattedTotal: string;
  activeCount: number;
  peakSpeed: number;
  formattedPeakSpeed: string;
  averageSpeed: number;
  formattedAverageSpeed: string;
}

export const useDownloadSpeed = (updateIntervalMs: number = 1000): SpeedMetrics => {
  const [metrics, setMetrics] = useState<SpeedMetrics>({
    currentSpeed: 0,
    formattedSpeed: '0 B/s',
    totalDownloaded: 0,
    formattedTotal: '0 B',
    activeCount: 0,
    peakSpeed: 0,
    formattedPeakSpeed: '0 B/s',
    averageSpeed: 0,
    formattedAverageSpeed: '0 B/s',
  });

  const speedHistory = useRef<number[]>([]);
  const peakSpeed = useRef<number>(0);

  const updateMetrics = useCallback(() => {
    const state = useDownloadsStore.getState();
    const activeDownloads = state.downloads.filter((d) => d.status === 'downloading');

    const currentSpeed = activeDownloads.reduce((sum, d) => sum + d.speed, 0);
    const totalDownloaded = state.downloads.reduce((sum, d) => sum + d.downloadedBytes, 0);
    const activeCount = activeDownloads.length;

    // Track peak speed
    if (currentSpeed > peakSpeed.current) {
      peakSpeed.current = currentSpeed;
    }

    // Rolling average (last 30 samples)
    speedHistory.current.push(currentSpeed);
    if (speedHistory.current.length > 30) {
      speedHistory.current.shift();
    }
    const averageSpeed =
      speedHistory.current.reduce((sum, s) => sum + s, 0) / speedHistory.current.length;

    setMetrics({
      currentSpeed,
      formattedSpeed: formatSpeed(currentSpeed),
      totalDownloaded,
      formattedTotal: formatBytes(totalDownloaded),
      activeCount,
      peakSpeed: peakSpeed.current,
      formattedPeakSpeed: formatSpeed(peakSpeed.current),
      averageSpeed,
      formattedAverageSpeed: formatSpeed(averageSpeed),
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMetrics, updateIntervalMs);
    updateMetrics(); // initial
    return () => clearInterval(interval);
  }, [updateIntervalMs, updateMetrics]);

  return metrics;
};
