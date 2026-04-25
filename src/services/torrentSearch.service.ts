/**
 * NexLoad Torrent Search Service
 * Unified search across multiple torrent indexers
 * YTS, EZTV, TPB (apibay.org), 1337x, Nyaa.si, LimeTorrents
 */

import axios from 'axios';
import { buildMagnet } from '../utils/buildMagnet';
import { formatBytes } from '../utils/formatBytes';

export interface SearchResult {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  seeds: number;
  leeches: number;
  age: string;
  magnet: string;
  source: string;
  category: string;
  detailUrl?: string;
}

const searchClient = axios.create({
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'NexLoad/1.0',
  },
});

// ─── YTS (Official Movies API) ──────────────────────────────────────────

export const searchYTS = async (query: string): Promise<SearchResult[]> => {
  try {
    const { data } = await searchClient.get('https://yts.mx/api/v2/list_movies.json', {
      params: {
        query_term: query,
        limit: 20,
        sort_by: 'seeds',
        order_by: 'desc',
      },
    });

    if (!data?.data?.movies) return [];

    return data.data.movies.flatMap((movie: any) =>
      (movie.torrents || []).map((torrent: any) => ({
        id: `yts_${movie.id}_${torrent.hash}`,
        name: `${movie.title} (${movie.year}) [${torrent.quality}] [${torrent.type}]`,
        size: torrent.size,
        sizeBytes: torrent.size_bytes || 0,
        seeds: torrent.seeds || 0,
        leeches: torrent.peers || 0,
        age: `${movie.year}`,
        magnet: buildMagnet(torrent.hash, `${movie.title} (${movie.year}) [${torrent.quality}]`),
        source: 'YTS',
        category: 'Movies',
        detailUrl: movie.url,
      }))
    );
  } catch (error) {
    console.warn('[Search] YTS failed:', error);
    return [];
  }
};

// ─── EZTV (Official TV API) ────────────────────────────────────────────

export const searchEZTV = async (query: string): Promise<SearchResult[]> => {
  try {
    const { data } = await searchClient.get('https://eztv.re/api/get-torrents', {
      params: {
        limit: 20,
        page: 1,
        imdb_id: undefined, // Could be enhanced with IMDB lookup
      },
    });

    if (!data?.torrents) return [];

    return data.torrents
      .filter((t: any) =>
        t.title?.toLowerCase().includes(query.toLowerCase())
      )
      .map((t: any) => ({
        id: `eztv_${t.id}`,
        name: t.title || t.filename,
        size: formatBytes(t.size_bytes || 0),
        sizeBytes: t.size_bytes || 0,
        seeds: t.seeds || 0,
        leeches: t.peers || 0,
        age: new Date((t.date_released_unix || 0) * 1000).toLocaleDateString(),
        magnet: t.magnet_url || buildMagnet(t.hash, t.title),
        source: 'EZTV',
        category: 'TV Shows',
        detailUrl: t.episode_url,
      }));
  } catch (error) {
    console.warn('[Search] EZTV failed:', error);
    return [];
  }
};

// ─── TPB (apibay.org JSON API) ─────────────────────────────────────────

export const searchTPB = async (query: string): Promise<SearchResult[]> => {
  try {
    const { data } = await searchClient.get('https://apibay.org/q.php', {
      params: { q: query, cat: '' },
    });

    if (!Array.isArray(data) || (data.length === 1 && data[0].name === 'No results returned')) {
      return [];
    }

    return data.map((t: any) => {
      const categories: Record<string, string> = {
        '100': 'Audio', '200': 'Video', '300': 'Software',
        '400': 'Games', '500': 'Other', '600': 'Other',
      };
      const catPrefix = String(t.category || '').substring(0, 3) + '00';

      return {
        id: `tpb_${t.id}`,
        name: t.name,
        size: formatBytes(parseInt(t.size) || 0),
        sizeBytes: parseInt(t.size) || 0,
        seeds: parseInt(t.seeders) || 0,
        leeches: parseInt(t.leechers) || 0,
        age: new Date(parseInt(t.added) * 1000).toLocaleDateString(),
        magnet: buildMagnet(t.info_hash, t.name),
        source: 'TPB',
        category: categories[catPrefix] || 'Other',
      };
    });
  } catch (error) {
    console.warn('[Search] TPB failed:', error);
    return [];
  }
};

// ─── Nyaa.si (Anime/Asian Content) ─────────────────────────────────────

export const searchNyaa = async (query: string): Promise<SearchResult[]> => {
  try {
    // Nyaa.si has an RSS feed we can parse, or use the unofficial API
    const { data } = await searchClient.get(`https://nyaa.si/?page=rss&q=${encodeURIComponent(query)}&c=0_0&f=0`, {
      responseType: 'text',
    });

    // Parse RSS XML — simplified extraction
    const items: SearchResult[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(data)) !== null) {
      const itemXml = match[1];
      const getTag = (tag: string) => {
        const m = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>(.*?)<\\/${tag}>`));
        return m ? (m[1] || m[2] || '') : '';
      };

      const name = getTag('title');
      const link = getTag('link');
      const seeders = parseInt(getTag('nyaa:seeders')) || 0;
      const leechers = parseInt(getTag('nyaa:leechers')) || 0;
      const sizeStr = getTag('nyaa:size');
      const pubDate = getTag('pubDate');
      const infoHash = getTag('nyaa:infoHash');

      if (name && infoHash) {
        items.push({
          id: `nyaa_${infoHash}`,
          name,
          size: sizeStr,
          sizeBytes: 0, // Would need parsing
          seeds: seeders,
          leeches: leechers,
          age: pubDate ? new Date(pubDate).toLocaleDateString() : 'Unknown',
          magnet: buildMagnet(infoHash, name),
          source: 'Nyaa',
          category: 'Anime',
          detailUrl: link,
        });
      }
    }

    return items.slice(0, 20);
  } catch (error) {
    console.warn('[Search] Nyaa failed:', error);
    return [];
  }
};

// ─── LimeTorrents ──────────────────────────────────────────────────────

export const searchLimeTorrents = async (query: string): Promise<SearchResult[]> => {
  try {
    // LimeTorrents doesn't have an official API, use RSS
    const encodedQuery = encodeURIComponent(query).replace(/%20/g, '-');
    const { data } = await searchClient.get(
      `https://www.limetorrents.lol/searchrss/${encodedQuery}/`,
      { responseType: 'text' }
    );

    const items: SearchResult[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(data)) !== null) {
      const itemXml = match[1];
      const getTag = (tag: string) => {
        const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
        return m ? m[1] : '';
      };

      const name = getTag('title');
      const link = getTag('link');
      const desc = getTag('description');

      // Extract seeds/leeches/size from description
      const seedMatch = desc.match(/Seeds:\s*(\d+)/i);
      const leechMatch = desc.match(/Leechers:\s*(\d+)/i);
      const sizeMatch = desc.match(/Size:\s*([\d.]+\s*\w+)/i);
      const hashMatch = link.match(/([a-fA-F0-9]{40})/);

      if (name && hashMatch) {
        items.push({
          id: `lime_${hashMatch[1]}`,
          name,
          size: sizeMatch ? sizeMatch[1] : 'Unknown',
          sizeBytes: 0,
          seeds: seedMatch ? parseInt(seedMatch[1]) : 0,
          leeches: leechMatch ? parseInt(leechMatch[1]) : 0,
          age: 'Unknown',
          magnet: buildMagnet(hashMatch[1], name),
          source: 'LimeTorrents',
          category: 'Other',
          detailUrl: link,
        });
      }
    }

    return items.slice(0, 20);
  } catch (error) {
    console.warn('[Search] LimeTorrents failed:', error);
    return [];
  }
};

// ─── Aggregate Search ──────────────────────────────────────────────────

/**
 * Search all indexers simultaneously and aggregate results
 * Uses Promise.allSettled so individual failures don't break the search
 */
export const searchAll = async (
  query: string,
  category?: string
): Promise<SearchResult[]> => {
  if (!query.trim()) return [];

  const searchFns = [
    searchYTS(query),
    searchEZTV(query),
    searchTPB(query),
    searchNyaa(query),
    searchLimeTorrents(query),
  ];

  const results = await Promise.allSettled(searchFns);

  let allResults = results
    .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // Filter by category if specified
  if (category && category !== 'all') {
    const categoryMap: Record<string, string[]> = {
      movies: ['Movies', 'Video'],
      tv: ['TV Shows'],
      music: ['Audio', 'Music'],
      software: ['Software'],
      books: ['Books'],
      anime: ['Anime'],
      games: ['Games'],
    };
    const allowedCategories = categoryMap[category] || [];
    if (allowedCategories.length > 0) {
      allResults = allResults.filter((r) =>
        allowedCategories.some((c) => r.category.toLowerCase().includes(c.toLowerCase()))
      );
    }
  }

  // Deduplicate by info hash (magnet)
  const seen = new Set<string>();
  const deduplicated = allResults.filter((r) => {
    const key = r.magnet.substring(0, 80); // Use first 80 chars of magnet as key
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by seeds (default)
  return deduplicated.sort((a, b) => b.seeds - a.seeds);
};
