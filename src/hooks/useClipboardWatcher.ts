/**
 * Clipboard Watcher Hook
 * Polls clipboard for URLs and auto-suggests downloads
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isValidUrl, detectLink } from '../utils/linkDetector';

interface ClipboardDetection {
  url: string;
  type: ReturnType<typeof detectLink>;
  timestamp: number;
}

interface UseClipboardWatcherOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
  onUrlDetected?: (detection: ClipboardDetection) => void;
}

export const useClipboardWatcher = ({
  enabled = true,
  pollIntervalMs = 2000,
  onUrlDetected,
}: UseClipboardWatcherOptions = {}) => {
  const [lastDetection, setLastDetection] = useState<ClipboardDetection | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastClipboardContent = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkClipboard = useCallback(async () => {
    try {
      // Dynamic import to avoid crash if module not available
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      const content = await Clipboard.getString();

      if (content && content !== lastClipboardContent.current && isValidUrl(content)) {
        lastClipboardContent.current = content;
        const type = detectLink(content);
        const detection: ClipboardDetection = {
          url: content,
          type,
          timestamp: Date.now(),
        };
        setLastDetection(detection);
        setDismissed(false);
        onUrlDetected?.(detection);
      }
    } catch {
      // Clipboard access may fail silently
    }
  }, [onUrlDetected]);

  useEffect(() => {
    if (!enabled) return;

    // Check on app focus
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkClipboard();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Poll periodically
    intervalRef.current = setInterval(checkClipboard, pollIntervalMs);

    // Initial check
    checkClipboard();

    return () => {
      subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, pollIntervalMs, checkClipboard]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    detection: dismissed ? null : lastDetection,
    dismiss,
  };
};
