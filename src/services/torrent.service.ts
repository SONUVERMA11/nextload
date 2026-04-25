/**
 * NexLoad Torrent Service
 * Handles magnet links and .torrent file downloads
 * Integration point for libtorrent/aria2 native module
 */

import { extractInfoHash, extractDisplayName } from '../utils/buildMagnet';

export type TorrentState =
  | 'checking'
  | 'downloading_metadata'
  | 'downloading'
  | 'finished'
  | 'seeding'
  | 'paused'
  | 'error';

export interface TorrentStatus {
  infoHash: string;
  name: string;
  state: TorrentState;
  progress: number; // 0-100
  downloadRate: number; // bytes/sec
  uploadRate: number; // bytes/sec
  seeds: number;
  peers: number;
  totalSize: number;
  downloadedBytes: number;
  eta: number; // seconds
  ratio: number;
  files: TorrentFileInfo[];
}

export interface TorrentFileInfo {
  index: number;
  name: string;
  path: string;
  size: number;
  progress: number;
  priority: number; // 0 = skip, 1 = normal, 7 = high
  selected: boolean;
}

export interface TorrentConfig {
  savePath: string;
  maxDownloadRate: number; // bytes/sec, 0 = unlimited
  maxUploadRate: number;
  enableDHT: boolean;
  enablePEX: boolean;
  enableLSD: boolean;
  maxConnections: number;
}

const DEFAULT_CONFIG: TorrentConfig = {
  savePath: '/storage/emulated/0/Download/NexLoad/Torrents',
  maxDownloadRate: 0,
  maxUploadRate: 0,
  enableDHT: true,
  enablePEX: true,
  enableLSD: true,
  maxConnections: 200,
};

// Torrent session state
let sessionConfig = { ...DEFAULT_CONFIG };
const activeTorrents = new Map<string, TorrentStatus>();

/**
 * Initialize the torrent engine
 * In production, this initializes libtorrent or aria2
 */
export const initTorrentEngine = async (config?: Partial<TorrentConfig>): Promise<void> => {
  sessionConfig = { ...DEFAULT_CONFIG, ...config };
  console.log('[TorrentService] Engine initialized with config:', sessionConfig);

  // TODO: Initialize native libtorrent module
  // await NativeModules.LibTorrent.init(sessionConfig);
};

/**
 * Add a magnet link for download
 */
export const addMagnet = async (
  magnetUri: string,
  savePath?: string
): Promise<string> => {
  const infoHash = extractInfoHash(magnetUri);
  const name = extractDisplayName(magnetUri);

  if (!infoHash) {
    throw new Error('Invalid magnet URI: could not extract info hash');
  }

  const status: TorrentStatus = {
    infoHash,
    name,
    state: 'downloading_metadata',
    progress: 0,
    downloadRate: 0,
    uploadRate: 0,
    seeds: 0,
    peers: 0,
    totalSize: 0,
    downloadedBytes: 0,
    eta: 0,
    ratio: 0,
    files: [],
  };

  activeTorrents.set(infoHash, status);
  console.log(`[TorrentService] Added magnet: ${name} (${infoHash})`);

  // TODO: Native bridge call
  // await NativeModules.LibTorrent.addMagnet(magnetUri, savePath || sessionConfig.savePath);

  return infoHash;
};

/**
 * Add a .torrent file for download
 */
export const addTorrentFile = async (
  filePath: string,
  savePath?: string
): Promise<string> => {
  console.log(`[TorrentService] Adding torrent file: ${filePath}`);

  // TODO: Native bridge call
  // const infoHash = await NativeModules.LibTorrent.addTorrentFile(filePath, savePath || sessionConfig.savePath);
  const infoHash = `torrent_${Date.now()}`;

  return infoHash;
};

/**
 * Pause a torrent
 */
export const pauseTorrent = async (infoHash: string): Promise<void> => {
  const torrent = activeTorrents.get(infoHash);
  if (torrent) {
    torrent.state = 'paused';
    torrent.downloadRate = 0;
    torrent.uploadRate = 0;
    activeTorrents.set(infoHash, torrent);
  }
  // await NativeModules.LibTorrent.pause(infoHash);
};

/**
 * Resume a torrent
 */
export const resumeTorrent = async (infoHash: string): Promise<void> => {
  const torrent = activeTorrents.get(infoHash);
  if (torrent) {
    torrent.state = 'downloading';
    activeTorrents.set(infoHash, torrent);
  }
  // await NativeModules.LibTorrent.resume(infoHash);
};

/**
 * Remove a torrent (optionally delete files)
 */
export const removeTorrent = async (
  infoHash: string,
  deleteFiles: boolean = false
): Promise<void> => {
  activeTorrents.delete(infoHash);
  // await NativeModules.LibTorrent.remove(infoHash, deleteFiles);
};

/**
 * Set file priorities (selective file download)
 */
export const setFilePriorities = async (
  infoHash: string,
  priorities: { index: number; priority: number }[]
): Promise<void> => {
  console.log(`[TorrentService] Setting file priorities for ${infoHash}:`, priorities);
  // await NativeModules.LibTorrent.setFilePriorities(infoHash, priorities);
};

/**
 * Get current status of a torrent
 */
export const getTorrentStatus = (infoHash: string): TorrentStatus | undefined => {
  return activeTorrents.get(infoHash);
};

/**
 * Get all active torrents
 */
export const getAllTorrents = (): TorrentStatus[] => {
  return Array.from(activeTorrents.values());
};

/**
 * Update session config (speed limits, connections, etc.)
 */
export const updateConfig = async (config: Partial<TorrentConfig>): Promise<void> => {
  sessionConfig = { ...sessionConfig, ...config };
  // await NativeModules.LibTorrent.updateConfig(sessionConfig);
};

/**
 * Shutdown the torrent engine gracefully
 */
export const shutdownEngine = async (): Promise<void> => {
  console.log('[TorrentService] Shutting down engine...');
  activeTorrents.clear();
  // await NativeModules.LibTorrent.shutdown();
};
