import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

function SkeletonBox({ width, height, borderRadius = 10, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Animated.View
      style={[
        styles.box,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

// ── Preset layouts ────────────────────────────────────────────────────────────

export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBox width={48} height={48} borderRadius={14} />
      <View style={styles.cardLines}>
        <SkeletonBox width="70%" height={14} borderRadius={7} />
        <SkeletonBox width="45%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4, style }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ marginBottom: 10 }} />
      ))}
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={styles.dashWrap}>
      {/* Hero placeholder */}
      <SkeletonBox width="100%" height={220} borderRadius={0} />

      <View style={styles.dashBody}>
        {/* Stat pills row */}
        <View style={styles.pillRow}>
          {[1,2,3,4].map(i => (
            <SkeletonBox key={i} width={72} height={72} borderRadius={18} />
          ))}
        </View>

        {/* Chart card */}
        <SkeletonBox width="100%" height={160} borderRadius={18} style={{ marginBottom: 12 }} />

        {/* Stat cards row */}
        <View style={styles.statRow}>
          {[1,2].map(i => (
            <SkeletonBox key={i} width="48%" height={90} borderRadius={16} />
          ))}
        </View>

        {/* Activity list */}
        <SkeletonList count={3} />
      </View>
    </View>
  );
}

export default SkeletonBox;

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(178,208,84,0.18)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,26,16,0.6)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardLines: { flex: 1, gap: 0 },
  dashWrap: { flex: 1, backgroundColor: '#060F08' },
  dashBody: { padding: 16, gap: 12 },
  pillRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});
