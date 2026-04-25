/**
 * NexLoad Typography
 * System font stack: SF Pro on iOS, Roboto on Android
 */

import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: '-apple-system',
  android: 'Roboto',
  default: 'System',
});

export const fontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  heavy: '800' as TextStyle['fontWeight'],
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 34,
  hero: 40,
};

export const lineHeights = {
  xs: 14,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 26,
  xxl: 30,
  xxxl: 42,
  hero: 48,
};

export const typography = {
  // Large Title — hero sections, splash
  heroTitle: {
    fontFamily,
    fontSize: fontSizes.hero,
    lineHeight: lineHeights.hero,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.5,
  } as TextStyle,

  // Title 1 — screen headers
  title1: {
    fontFamily,
    fontSize: fontSizes.xxxl,
    lineHeight: lineHeights.xxxl,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.4,
  } as TextStyle,

  // Title 2 — section headers
  title2: {
    fontFamily,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
  } as TextStyle,

  // Title 3 — card titles
  title3: {
    fontFamily,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.2,
  } as TextStyle,

  // Headline — important labels
  headline: {
    fontFamily,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.semibold,
  } as TextStyle,

  // Body — default text
  body: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
  } as TextStyle,

  // Body bold
  bodyBold: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semibold,
  } as TextStyle,

  // Subheadline
  subheadline: {
    fontFamily,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
  } as TextStyle,

  // Caption 1 — metadata, timestamps
  caption1: {
    fontFamily,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
  } as TextStyle,

  // Caption 2 — smallest text
  caption2: {
    fontFamily,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
  } as TextStyle,

  // Monospace — speeds, bytes, technical data
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
  } as TextStyle,
};

export type Typography = typeof typography;
