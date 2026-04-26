/**
 * Search Screen
 * Unified torrent search with category filters, sort, and sub-tabs
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useSearchStore, SearchTab } from '../store/search.store';
import { searchAll, SearchResult } from '../services/torrentSearch.service';
import { TorrentResultCard } from '../components/TorrentResultCard';
import { FilterChips, CATEGORY_CHIPS, SORT_CHIPS } from '../components/FilterChips';
import { TorrentResultSkeleton } from '../components/SkeletonLoader';

const TABS: { key: SearchTab; label: string; icon: any }[] = [
  { key: 'torrent', label: 'Torrent', icon: 'magnet-outline' },
  { key: 'direct', label: 'Direct Link', icon: 'link-outline' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
];

export const SearchScreen: React.FC = () => {
  const { colors, radii, spacing, typography: typo, isDark } = useTheme();
  const {
    query,
    setQuery,
    results,
    setResults,
    isLoading,
    setLoading,
    error,
    setError,
    category,
    setCategory,
    sortBy,
    setSortBy,
    activeTab,
    setActiveTab,
    addToHistory,
    searchHistory,
    getSortedResults,
  } = useSearchStore();

  const [refreshing, setRefreshing] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    addToHistory(query.trim());

    try {
      const searchResults = await searchAll(query.trim(), category);
      setResults(searchResults);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, category, setLoading, setError, addToHistory, setResults]);

  const handleRefresh = useCallback(async () => {
    if (!query.trim()) return;
    setRefreshing(true);
    try {
      const searchResults = await searchAll(query.trim(), category);
      setResults(searchResults);
    } catch {
      // Silent fail on refresh
    }
    setRefreshing(false);
  }, [query, category, setResults]);

  const sortedResults = getSortedResults();

  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => <TorrentResultCard result={item} />,
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Sub-tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabItem,
                isActive && {
                  borderBottomWidth: 2,
                  borderBottomColor: colors.accent,
                },
              ]}
            >
              <Icon
                name={tab.icon}
                size={16}
                color={isActive ? colors.accent : colors.muted}
              />
              <Text
                style={[
                  typo.caption1,
                  {
                    color: isActive ? colors.accent : colors.muted,
                    marginLeft: 4,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <Icon
            name="search"
            size={18}
            color={colors.muted}
            style={{ marginLeft: spacing.md }}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder={
              activeTab === 'torrent'
                ? 'Search torrents...'
                : activeTab === 'youtube'
                ? 'Search YouTube videos...'
                : 'Paste a direct download link...'
            }
            placeholderTextColor={colors.placeholder}
            style={[
              typo.body,
              styles.searchInput,
              { color: colors.text },
            ]}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={{ padding: spacing.sm }}
            >
              <Icon name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSearch}
            style={[
              styles.searchButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radii.md,
                margin: 4,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text style={[typo.caption1, { color: '#FFF' }]}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Torrent Tab Content */}
      {activeTab === 'torrent' && (
        <>
          {/* Category Chips */}
          <FilterChips
            chips={CATEGORY_CHIPS}
            activeKey={category}
            onSelect={(key) => setCategory(key as any)}
          />

          {/* Sort Chips */}
          {results.length > 0 && (
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
              <View style={styles.sortRow}>
                <Text style={[typo.caption1, { color: colors.muted }]}>
                  {sortedResults.length} results
                </Text>
                <View style={styles.sortChips}>
                  {SORT_CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip.key}
                      onPress={() => setSortBy(chip.key as any)}
                      style={[
                        styles.miniChip,
                        {
                          backgroundColor:
                            sortBy === chip.key ? colors.accentSoft : 'transparent',
                          borderRadius: radii.sm,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 2,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typo.caption2,
                          {
                            color: sortBy === chip.key ? colors.accent : colors.muted,
                          },
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Results */}
          {isLoading ? (
            <View style={{ paddingTop: spacing.md }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
                  <TorrentResultSkeleton />
                </View>
              ))}
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <Icon name="alert-circle-outline" size={48} color={colors.danger} />
              <Text style={[typo.body, { color: colors.danger, marginTop: spacing.md }]}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={handleSearch}
                style={[
                  styles.retryBtn,
                  {
                    backgroundColor: colors.dangerSoft,
                    borderRadius: radii.md,
                    marginTop: spacing.lg,
                    paddingHorizontal: spacing.xl,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <Text style={[typo.bodyBold, { color: colors.danger }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : results.length === 0 && query ? (
            <View style={styles.emptyState}>
              <Icon name="search-outline" size={48} color={colors.border} />
              <Text style={[typo.body, { color: colors.muted, marginTop: spacing.md }]}>
                No results found
              </Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="search-outline" size={64} color={colors.border} />
              <Text style={[typo.title3, { color: colors.muted, marginTop: spacing.lg }]}>
                Search Torrents
              </Text>
              <Text
                style={[
                  typo.subheadline,
                  { color: colors.muted, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: 40 },
                ]}
              >
                Search across YTS, EZTV, TPB, Nyaa, and more simultaneously
              </Text>

              {/* Recent Searches */}
              {searchHistory.length > 0 && (
                <View style={[styles.historySection, { marginTop: spacing.xxl }]}>
                  <Text style={[typo.caption1, { color: colors.muted, marginBottom: spacing.sm }]}>
                    Recent Searches
                  </Text>
                  {searchHistory.slice(0, 5).map((h, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setQuery(h);
                        // Trigger search
                        setTimeout(handleSearch, 100);
                      }}
                      style={[
                        styles.historyItem,
                        {
                          backgroundColor: colors.card,
                          borderRadius: radii.md,
                          padding: spacing.md,
                          marginBottom: spacing.xs,
                        },
                      ]}
                    >
                      <Icon name="time-outline" size={16} color={colors.muted} />
                      <Text
                        style={[typo.body, { color: colors.text, marginLeft: spacing.sm, flex: 1 }]}
                        numberOfLines={1}
                      >
                        {h}
                      </Text>
                      <Icon name="arrow-forward" size={14} color={colors.muted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <FlatList
              data={sortedResults}
              renderItem={renderResult}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.accent}
                  colors={[colors.accent]}
                />
              }
            />
          )}
        </>
      )}

      {/* Direct Link Tab */}
      {activeTab === 'direct' && (
        <View style={styles.tabContent}>
          <Icon name="link-outline" size={48} color={colors.border} />
          <Text style={[typo.body, { color: colors.muted, marginTop: spacing.md, textAlign: 'center' }]}>
            Paste a direct download link in the search bar above
          </Text>
        </View>
      )}

      {/* YouTube Tab */}
      {activeTab === 'youtube' && (
        <View style={styles.tabContent}>
          <Icon name="logo-youtube" size={48} color="#FF0000" />
          <Text style={[typo.body, { color: colors.muted, marginTop: spacing.md, textAlign: 'center' }]}>
            Search YouTube, Instagram, TikTok & 1000+ sites
          </Text>
          <Text style={[typo.caption1, { color: colors.muted, marginTop: spacing.sm, textAlign: 'center' }]}>
            Powered by yt-dlp backend
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  searchContainer: {},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  searchButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortChips: {
    flexDirection: 'row',
    gap: 4,
  },
  miniChip: {},
  errorState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  retryBtn: {},
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  historySection: {
    width: '100%',
    paddingHorizontal: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
});
