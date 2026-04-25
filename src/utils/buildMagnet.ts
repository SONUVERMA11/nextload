/**
 * Build a magnet URI from infohash and display name
 * Includes well-known public trackers for better peer discovery
 */

const PUBLIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.tiny-vps.com:6969/announce',
  'udp://tracker.pirateparty.gr:6969/announce',
];

export const buildMagnet = (infoHash: string, displayName: string): string => {
  const hash = infoHash.toLowerCase().replace(/\s/g, '');
  const name = encodeURIComponent(displayName);

  let magnet = `magnet:?xt=urn:btih:${hash}&dn=${name}`;

  PUBLIC_TRACKERS.forEach((tracker) => {
    magnet += `&tr=${encodeURIComponent(tracker)}`;
  });

  return magnet;
};

/**
 * Extract info hash from a magnet URI
 */
export const extractInfoHash = (magnetUri: string): string | null => {
  const match = magnetUri.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
  return match ? match[1].toLowerCase() : null;
};

/**
 * Extract display name from a magnet URI
 */
export const extractDisplayName = (magnetUri: string): string => {
  const match = magnetUri.match(/dn=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : 'Unknown Torrent';
};
