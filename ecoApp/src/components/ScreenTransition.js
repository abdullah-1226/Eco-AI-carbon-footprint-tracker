import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Wraps any screen content with a fade-in + slide-up entrance animation.
 * Usage: replace the root <View style={{ flex:1 }}> with <ScreenTransition>.
 */
export default function ScreenTransition({ children, style, delay = 0, distance = 22 }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 360,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 360,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
}
