/**
 * NexLoad Search Store (Zustand)
 * Manages torrent search results, filters, history
 */

import { create } from 'zustand';

export type SearchCategory =
  | 'all'
  | 'movies'
  | 'tv'
  | 'music'
  | 'software'
  | 'books'
  | 'anime'
  | 'games';

export type SearchSort = 'seeds' | 'size' | 'date' | 'leeches';

export type SearchTab = 'torrent' | 'direct' | 'youtube';

export interface TorrentResult {
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
  files?: TorrentFile[];
  trackers?: string[];
  description?: string;
}

export interface TorrentFile {
  name: string;
  size: string;
  sizeBytes: number;
  selected: boolean;
}

interface SearchState {
  // State
  query: string;
  results: TorrentResult[];
  isLoading: boolean;
  error: string | null;
  category: SearchCategory;
  sortBy: SearchSort;
  activeTab: SearchTab;
  searchHistory: string[];
  selectedResult: TorrentResult | null;

  // Actions
  setQuery: (query: string) => void;
  setResults: (results: TorrentResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCategory: (category: SearchCategory) => void;
  setSortBy: (sort: SearchSort) => void;
  setActiveTab: (tab: SearchTab) => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  setSelectedResult: (result: TorrentResult | null) => void;
  clearResults: () => void;

  // Computed
  getSortedResults: () => TorrentResult[];
}

const MAX_HISTORY = 20;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  isLoading: false,
  error: null,
  category: 'all',
  sortBy: 'seeds',
  activeTab: 'torrent',
  searchHistory: [],
  selectedResult: null,

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setCategory: (category) => set({ category }),
  setSortBy: (sortBy) => set({ sortBy }),
  setActiveTab: (activeTab) => set({ activeTab }),

  addToHistory: (query) => {
    if (!query.trim()) return;
    set((state) => {
      const filtered = state.searchHistory.filter(
        (h) => h.toLowerCase() !== query.toLowerCase()
      );
      return {
        searchHistory: [query, ...filtered].slice(0, MAX_HISTORY),
      };
    });
  },

  clearHistory: () => set({ searchHistory: [] }),

  setSelectedResult: (selectedResult) => set({ selectedResult }),

  clearResults: () => set({ results: [], error: null }),

  getSortedResults: () => {
    const { results, sortBy } = get();
    const sorted = [...results];
    switch (sortBy) {
      case 'seeds':
        return sorted.sort((a, b) => b.seeds - a.seeds);
      case 'leeches':
        return sorted.sort((a, b) => b.leeches - a.leeches);
      case 'size':
        return sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
      case 'date':
        return sorted; // Already sorted by date from APIs
      default:
        return sorted;
    }
  },
}));
