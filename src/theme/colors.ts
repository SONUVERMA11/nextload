/**
 * NexLoad Color Palettes
 * Primary: #185FA5 (blue) | Secondary: #534AB7 (purple)
 * iOS-inspired design tokens for light and dark modes
 */

export const light = {
  // Backgrounds
  bg: '#F2F2F7',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  sheet: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.4)',

  // Text
  text: '#000000',
  textSecondary: '#3C3C43',
  muted: '#6E6E73',
  placeholder: '#C7C7CC',

  // Borders & Dividers
  border: '#E5E5EA',
  separator: '#C6C6C8',

  // Brand Colors
  accent: '#185FA5',
  accentSoft: '#E6F1FB',
  accentPressed: '#134D87',
  purple: '#534AB7',
  purpleSoft: '#EEEDFA',

  // Semantic Colors
  success: '#3B6D11',
  successSoft: '#E8F5E0',
  warning: '#854F0B',
  warningSoft: '#FFF8E6',
  danger: '#A32D2D',
  dangerSoft: '#FDE8E8',

  // Seed Health (Torrent)
  seedHigh: '#34C759',
  seedMid: '#FF9F0A',
  seedLow: '#FF3B30',

  // Progress & Activity
  progressTrack: '#E5E5EA',
  progressFill: '#185FA5',
  shimmer: '#F0F0F4',
  shimmerHighlight: '#E8E8ED',

  // Navigation
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
  tabActive: '#185FA5',
  tabInactive: '#8E8E93',

  // FAB
  fab: '#185FA5',
  fabIcon: '#FFFFFF',

  // Status Bar
  statusBar: 'dark-content' as const,
};

export const dark = {
  // Backgrounds
  bg: '#000000',
  card: '#1C1C1E',
  cardElevated: '#2C2C2E',
  sheet: '#1C1C1E',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Text
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  muted: '#8E8E93',
  placeholder: '#48484A',

  // Borders & Dividers
  border: '#2C2C2E',
  separator: '#38383A',

  // Brand Colors
  accent: '#2A8FE0',
  accentSoft: '#0D2A42',
  accentPressed: '#3DA5F5',
  purple: '#BF5AF2',
  purpleSoft: '#2D1B4E',

  // Semantic Colors
  success: '#34C759',
  successSoft: '#0D3318',
  warning: '#FF9F0A',
  warningSoft: '#3D2800',
  danger: '#FF453A',
  dangerSoft: '#3D0F0F',

  // Seed Health (Torrent)
  seedHigh: '#34C759',
  seedMid: '#FF9F0A',
  seedLow: '#FF453A',

  // Progress & Activity
  progressTrack: '#2C2C2E',
  progressFill: '#2A8FE0',
  shimmer: '#1C1C1E',
  shimmerHighlight: '#2C2C2E',

  // Navigation
  tabBar: '#1C1C1E',
  tabBarBorder: '#2C2C2E',
  tabActive: '#2A8FE0',
  tabInactive: '#8E8E93',

  // FAB
  fab: '#2A8FE0',
  fabIcon: '#FFFFFF',

  // Status Bar
  statusBar: 'light-content' as const,
};

export type ThemeColors = typeof light;
