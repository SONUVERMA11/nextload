/**
 * FilterChips Component
 * Horizontally scrollable category filter chips
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface ChipItem {
  key: string;
  label: string;
  icon?: any;
  count?: number;
}

interface FilterChipsProps {
  chips: ChipItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  scrollable?: boolean;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  chips,
  activeKey,
  onSelect,
  scrollable = true,
}) => {
  const { colors, radii, spacing, typography: typo } = useTheme();

  const renderChip = (chip: ChipItem) => {
    const isActive = activeKey === chip.key;

    return (
      <TouchableOpacity
        key={chip.key}
        onPress={() => onSelect(chip.key)}
        activeOpacity={0.7}
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? colors.accent : colors.card,
            borderRadius: radii.full,
            borderWidth: 1,
            borderColor: isActive ? colors.accent : colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm + 2,
            marginRight: spacing.sm,
          },
        ]}
      >
        {chip.icon && (
          <Icon
            name={chip.icon}
            size={14}
            color={isActive ? '#FFFFFF' : colors.muted}
            style={{ marginRight: 6 }}
          />
        )}
        <Text
          style={[
            typo.caption1,
            {
              color: isActive ? '#FFFFFF' : colors.text,
            },
          ]}
        >
          {chip.label}
        </Text>
        {chip.count !== undefined && (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : colors.progressTrack,
                marginLeft: 6,
              },
            ]}
          >
            <Text
              style={[
                typo.caption2,
                {
                  color: isActive ? '#FFFFFF' : colors.muted,
                },
              ]}
            >
              {chip.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: spacing.lg }]}
      >
        {chips.map(renderChip)}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.wrapContainer, { paddingHorizontal: spacing.lg }]}>
      {chips.map(renderChip)}
    </View>
  );
};

// ─── Preset chip sets ────────────────────────────────────────────────────

export const CATEGORY_CHIPS: ChipItem[] = [
  { key: 'all', label: 'All', icon: 'search' },
  { key: 'movies', label: 'Movies', icon: 'film' },
  { key: 'tv', label: 'TV Shows', icon: 'tv' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'software', label: 'Software', icon: 'code-slash' },
  { key: 'books', label: 'Books', icon: 'book' },
  { key: 'anime', label: 'Anime', icon: 'color-wand' },
  { key: 'games', label: 'Games', icon: 'game-controller' },
];

export const SORT_CHIPS: ChipItem[] = [
  { key: 'seeds', label: 'Seeds', icon: 'arrow-up' },
  { key: 'size', label: 'Size', icon: 'resize' },
  { key: 'date', label: 'Date', icon: 'calendar' },
  { key: 'leeches', label: 'Leeches', icon: 'arrow-down' },
];

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 8,
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
});
