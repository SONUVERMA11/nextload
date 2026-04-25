/**
 * SkeletonLoader Component
 * Animated shimmer placeholder for loading states
 * iOS-style skeleton loading (not spinners)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.shimmer,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton card for download items
 */
export const DownloadCardSkeleton: React.FC = () => {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginBottom: spacing.sm,
        },
      ]}
    >
      <View style={styles.row}>
        <SkeletonLoader width={40} height={40} borderRadius={12} />
        <View style={[styles.flex, { marginLeft: spacing.md }]}>
          <SkeletonLoader width="80%" height={16} />
          <SkeletonLoader width="50%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={6} borderRadius={3} style={{ marginTop: 12 }} />
      <View style={[styles.row, { marginTop: 8 }]}>
        <SkeletonLoader width={60} height={12} />
        <SkeletonLoader width={80} height={12} />
      </View>
    </View>
  );
};

/**
 * Skeleton card for torrent search results
 */
export const TorrentResultSkeleton: React.FC = () => {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginBottom: spacing.sm,
        },
      ]}
    >
      <SkeletonLoader width="90%" height={16} />
      <SkeletonLoader width="60%" height={12} style={{ marginTop: 8 }} />
      <View style={[styles.row, { marginTop: 12 }]}>
        <SkeletonLoader width={50} height={24} borderRadius={12} />
        <SkeletonLoader width={50} height={24} borderRadius={12} />
        <SkeletonLoader width={70} height={24} borderRadius={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
});
