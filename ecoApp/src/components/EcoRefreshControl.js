import React, { useEffect, useRef } from 'react';
import { RefreshControl, View, Animated, Text, StyleSheet, Platform } from 'react-native';

// Animated overlay that shows a spinning leaf at the top when refreshing
export function RefreshOverlay({ refreshing }) {
  const spin  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 800, useNativeDriver: true })
      ).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        spin.stopAnimation();
        spin.setValue(0);
      });
    }
  }, [refreshing]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (Platform.OS === 'web') return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.pill}>
        <Animated.Text style={[styles.leaf, { transform: [{ rotate }] }]}>🌿</Animated.Text>
        <Text style={styles.txt}>Refreshing…</Text>
      </View>
    </Animated.View>
  );
}

// Drop-in replacement for RefreshControl with eco-styled colors
export default function EcoRefreshControl({ refreshing, onRefresh, ...rest }) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#B2D054"
      colors={['#B2D054', '#52C77A']}
      progressBackgroundColor="#0D1A10"
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13,26,16,0.95)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(178,208,84,0.3)',
  },
  leaf: { fontSize: 18 },
  txt:  { fontSize: 13, fontWeight: '700', color: '#B2D054' },
});
