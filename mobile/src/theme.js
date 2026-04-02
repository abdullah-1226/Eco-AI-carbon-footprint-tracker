import { MD3LightTheme } from 'react-native-paper';

// EcoTrack AI — FYP Carbon Footprint Tracker
// Eco-green color palette

export const Colors = {
  // Brand
  primary:      '#2E7D32',   // deep eco green
  primaryDark:  '#1B5E20',
  primaryLight: '#C8E6C9',
  secondary:    '#00897B',   // teal (water / environment)
  secondaryLight:'#B2DFDB',
  accent:       '#66BB6A',   // medium green

  // Semantic
  success:      '#43A047',
  successLight: '#E8F5E9',
  danger:       '#E53935',
  dangerLight:  '#FFEBEE',
  warning:      '#FB8C00',
  warningLight: '#FFF3E0',
  info:         '#0288D1',
  infoLight:    '#E1F5FE',

  // Neutral
  white:        '#FFFFFF',
  background:   '#F1F8E9',   // very light green tint
  surface:      '#FFFFFF',
  border:       '#C8E6C9',
  muted:        '#6c757d',
  text:         '#1B2A1B',   // dark green-black
  textMuted:    '#5D7B5D',
  dark:         '#1B2A1B',
  light:        '#F1F8E9',
};

export const Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary:        Colors.primary,
    secondary:      Colors.secondary,
    background:     Colors.background,
    surface:        Colors.surface,
    error:          Colors.danger,
    onPrimary:      Colors.white,
    onBackground:   Colors.text,
    onSurface:      Colors.text,
    outline:        Colors.border,
  },
};

export const Typography = {
  h1:    { fontSize: 32, fontWeight: '800', color: Colors.dark, letterSpacing: -0.5 },
  h2:    { fontSize: 26, fontWeight: '700', color: Colors.dark },
  h3:    { fontSize: 20, fontWeight: '700', color: Colors.dark },
  h4:    { fontSize: 16, fontWeight: '700', color: Colors.dark },
  body:  { fontSize: 15, color: Colors.text, lineHeight: 22 },
  small: { fontSize: 12, color: Colors.textMuted },
  label: { fontSize: 13, fontWeight: '600', color: Colors.dark },
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const Radii = { sm: 6, md: 10, lg: 16, xl: 24, pill: 50 };

export const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 8 },
};
