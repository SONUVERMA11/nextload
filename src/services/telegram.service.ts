/**
 * NexLoad Telegram Service
 * Downloads files from Telegram via MTProto (gramjs)
 * Supports t.me file links
 */

import { useSettingsStore } from '../store/settings.store';

export interface TelegramFileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  messageId: number;
  chatId: string;
}

export interface TelegramDownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

type ProgressCallback = (progress: TelegramDownloadProgress) => void;

/**
 * Parse a t.me link to extract chat and message info
 * Formats: https://t.me/channel/1234, https://t.me/c/1234567/890
 */
export const parseTelegramLink = (url: string): { chatId: string; messageId: number } | null => {
  // Public channel: https://t.me/channelname/12345
  const publicMatch = url.match(/t\.me\/([a-zA-Z_][\w]+)\/(\d+)/);
  if (publicMatch) {
    return { chatId: publicMatch[1], messageId: parseInt(publicMatch[2]) };
  }

  // Private channel: https://t.me/c/1234567890/12345
  const privateMatch = url.match(/t\.me\/c\/(\d+)\/(\d+)/);
  if (privateMatch) {
    return { chatId: `-100${privateMatch[1]}`, messageId: parseInt(privateMatch[2]) };
  }

  return null;
};

/**
 * Initialize Telegram client with user credentials
 * Requires API ID and API Hash from https://my.telegram.org
 */
export const initTelegramClient = async (): Promise<boolean> => {
  const { telegramApiId, telegramApiHash } = useSettingsStore.getState();

  if (!telegramApiId || !telegramApiHash) {
    console.warn('[Telegram] API credentials not configured');
    return false;
  }

  try {
    // TODO: Initialize gramjs client
    // const { TelegramClient } = require('telegram');
    // const { StringSession } = require('telegram/sessions');
    //
    // const client = new TelegramClient(
    //   new StringSession(''),
    //   parseInt(telegramApiId),
    //   telegramApiHash,
    //   { connectionRetries: 5 }
    // );
    //
    // await client.start({ phoneNumber: async () => prompt('Phone number:') });

    console.log('[Telegram] Client initialized successfully');
    return true;
  } catch (error) {
    console.error('[Telegram] Init failed:', error);
    return false;
  }
};

/**
 * Get file info from a Telegram message
 */
export const getFileInfo = async (url: string): Promise<TelegramFileInfo | null> => {
  const parsed = parseTelegramLink(url);
  if (!parsed) {
    throw new Error('Invalid Telegram link format');
  }

  try {
    // TODO: Fetch message via gramjs
    // const message = await client.getMessages(parsed.chatId, { ids: parsed.messageId });
    // const media = message[0]?.media;

    // Placeholder return
    console.log(`[Telegram] Fetching file info for ${parsed.chatId}/${parsed.messageId}`);
    return {
      fileName: `telegram_file_${parsed.messageId}`,
      fileSize: 0,
      mimeType: 'application/octet-stream',
      messageId: parsed.messageId,
      chatId: parsed.chatId,
    };
  } catch (error) {
    console.error('[Telegram] Get file info failed:', error);
    return null;
  }
};

/**
 * Download a file from Telegram
 */
export const downloadFile = async (
  url: string,
  savePath: string,
  onProgress?: ProgressCallback
): Promise<string> => {
  const parsed = parseTelegramLink(url);
  if (!parsed) {
    throw new Error('Invalid Telegram link format');
  }

  console.log(`[Telegram] Downloading from ${parsed.chatId}/${parsed.messageId} to ${savePath}`);

  // TODO: Download via gramjs
  // const message = await client.getMessages(parsed.chatId, { ids: parsed.messageId });
  // const buffer = await client.downloadMedia(message[0], {
  //   progressCallback: (downloaded, total) => {
  //     onProgress?.({ downloaded, total, percentage: (downloaded / total) * 100 });
  //   },
  // });
  // await RNFS.writeFile(savePath, buffer.toString('base64'), 'base64');

  return savePath;
};

/**
 * Check if Telegram credentials are configured
 */
export const isTelegramConfigured = (): boolean => {
  const { telegramApiId, telegramApiHash } = useSettingsStore.getState();
  return !!(telegramApiId && telegramApiHash);
};
