import React, { createContext, useContext } from 'react';

// ── Theme definitions ─────────────────────────────────────────────────────────
// Dark — Carbon Dark: deep forest-black gradient, optimised luminance contrast
export const DARK = {
  key:        'dark',
  bgGrad:     ['#0A1A0F', '#0C1B12', '#060D07'],
  card:       'rgba(255,255,255,0.06)',
  cardSolid:  '#101E13',
  border:     'rgba(255,255,255,0.10)',
  inputBg:    'rgba(255,255,255,0.07)',
  trackBg:    'rgba(255,255,255,0.13)',
  pillBg:     'rgba(255,255,255,0.08)',
  divider:    'rgba(255,255,255,0.08)',
  text:       '#EFF4EE',
  textSub:    'rgba(239,244,238,0.65)',
  textMuted:  'rgba(239,244,238,0.40)',
  headerText: '#EFF4EE',
  isDark:     true,
};

const ThemeCtx = createContext({ theme: DARK, themeKey: 'dark', setThemeKey: () => {} });

export function ThemeProvider({ children }) {
  return (
    <ThemeCtx.Provider value={{ theme: DARK, themeKey: 'dark', setThemeKey: () => {} }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeCtx);

// ── Shared colour builder — call inside a component after useAppTheme() ────────
export function buildC(theme) {
  const d = theme.isDark;
  return {
    bg:         'transparent',
    card:        theme.card,
    cardSolid:   theme.cardSolid,
    border:      theme.border,
    inputBg:     theme.inputBg,
    trackBg:     theme.trackBg,
    pillBg:      theme.pillBg,
    divider:     theme.divider,
    headerText:  theme.headerText,

    // Primary — Olive Green #B2D054 (WCAG compliant eco green)
    green50:    d ? 'rgba(178,208,84,0.10)'  : '#EEF3D5',
    green100:   d ? '#D8EC8C'               : '#B2D054',
    green600:   '#B2D054',   // primary accent — same in both modes
    green700:   '#8FA832',   // deeper variant for pressed/hover states
    green800:   d ? '#E8F5A0'               : '#5A6B20',

    // Secondary — Teal: muted for light, sky-blue for dark (high-contrast)
    teal50:     d ? 'rgba(90,200,250,0.10)'  : '#E0F4F4',
    teal100:    d ? '#A8DEFF'               : '#39A7A7',
    teal600:    d ? '#5AC8FA'  : '#39A7A7',
    teal800:    d ? '#D0EEFF'               : '#1A6B6B',

    amber50:    d ? 'rgba(245,158,11,0.09)' : '#FEF3C7',
    amber100:   d ? '#FFE5A0'               : '#FCD34D',
    amber600:   '#F59E0B',

    coral50:    d ? 'rgba(244,63,94,0.09)'  : '#FEE2E2',
    coral100:   d ? '#FFA8B8'               : '#FCA5A5',
    coral600:   '#F43F5E',

    // Card shadow (applied inline where needed)
    cardShadow: d
      ? { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 }
      : { shadowColor: '#1A2318', shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },

    text:       theme.text,
    textSub:    theme.textSub,
    textMuted:  theme.textMuted,
    mint:       '#B2D054',
  };
}
