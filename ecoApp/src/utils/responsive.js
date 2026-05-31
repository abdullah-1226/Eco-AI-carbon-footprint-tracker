import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export const SIDEBAR_W   = 240;   // sidebar width on web ≥ 768 px
export const MAX_CONTENT = 1200;  // max content width on very wide screens

export function useLayout() {
  const [dims, setDims] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub?.remove();
  }, []);

  const { width, height } = dims;
  const isWeb   = Platform.OS === 'web';
  const isWide  = width >= 768;

  return {
    width,
    height,
    isWeb,
    isWide,
    // sidebar only on web at tablet+ width
    showSidebar: isWeb && isWide,
    sidebarW:    isWeb && isWide ? SIDEBAR_W : 0,
  };
}
