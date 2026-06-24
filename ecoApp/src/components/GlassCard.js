import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function GlassCard({
  children,
  style,
  intensity = 18,
  tint = 'dark',
  borderColor = 'rgba(178,208,84,0.15)',
  borderWidth = 1,
  borderRadius = 20,
  padding = 16,
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webFallback, { borderColor, borderWidth, borderRadius, padding }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { borderColor, borderWidth, borderRadius }, style]}>
      <BlurView intensity={intensity} tint={tint} style={[styles.blur, { borderRadius }]}>
        <View style={[styles.inner, { padding }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: 'rgba(13,26,16,0.55)',
  },
  webFallback: {
    backgroundColor: 'rgba(13,26,16,0.85)',
    borderStyle: 'solid',
  },
});
