import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const TYPE_CONFIG = {
  empty:   { emoji: '📭', color: 'rgba(178,208,84,0.6)' },
  plant:   { emoji: '🌱', color: 'rgba(82,199,122,0.7)'  },
  success: { emoji: '✅', color: 'rgba(82,199,122,0.9)'  },
  loading: { emoji: '🌿', color: 'rgba(178,208,84,0.7)'  },
  earth:   { emoji: '🌍', color: 'rgba(90,200,250,0.7)'  },
};

export default function LottieEmptyState({
  type = 'empty',
  message = 'Nothing here yet',
  subMessage,
  size = 80,
  style,
}) {
  const bounce = useRef(new Animated.Value(0)).current;
  const glow   = useRef(new Animated.Value(0)).current;
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.empty;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -12, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bounce, { toValue:   0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] });

  return (
    <View style={[styles.wrap, style]}>
      {/* Glowing ring behind emoji */}
      <Animated.View style={[
        styles.glowRing,
        { width: size * 1.7, height: size * 1.7, borderRadius: size, backgroundColor: config.color, opacity: glowOpacity },
      ]} />

      {/* Bouncing emoji */}
      <Animated.Text style={[styles.emoji, { fontSize: size, transform: [{ translateY: bounce }] }]}>
        {config.emoji}
      </Animated.Text>

      <Text style={styles.msg}>{message}</Text>
      {subMessage ? <Text style={styles.sub}>{subMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  glowRing: {
    position: 'absolute',
    alignSelf: 'center',
  },
  emoji: {
    marginBottom: 14,
  },
  msg: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(239,244,238,0.75)',
    textAlign: 'center',
  },
  sub: {
    fontSize: 12,
    color: 'rgba(239,244,238,0.45)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
