import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Platform, View } from 'react-native';

let ConfettiCannon = null;
try {
  ConfettiCannon = require('react-native-confetti-cannon').default;
} catch (_) {}

const EcoConfetti = forwardRef(function EcoConfetti(_, ref) {
  const cannonRef = useRef(null);

  useImperativeHandle(ref, () => ({
    fire: () => {
      try {
        if (Platform.OS !== 'web' && cannonRef.current) {
          cannonRef.current.start();
        }
      } catch (_) {}
    },
  }));

  if (Platform.OS === 'web' || !ConfettiCannon) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
    >
      <ConfettiCannon
        ref={cannonRef}
        count={120}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut
        explosionSpeed={350}
        fallSpeed={3000}
        colors={['#B2D054', '#52C77A', '#5AC8FA', '#F59E0B', '#A855F7', '#FFFFFF']}
      />
    </View>
  );
});

export default EcoConfetti;
