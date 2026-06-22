import { MD3DarkTheme } from 'react-native-paper';

// EcoTrack AI — FYP Carbon Footprint Tracker
// Eco-green color palette

export const Colors = {
  // Brand — Carbon Eco AI professional palette
  primary:      '#B2D054',   // olive green (WCAG AA)
  primaryDark:  '#8FA832',   // deeper olive
  primaryLight: '#EEF3D5',   // tint
  secondary:    '#39A7A7',   // muted teal (light mode)
  secondaryLight:'#E0F4F4',
  accent:       '#5AC8FA',   // sky teal (dark mode)

  // Semantic
  success:      '#43A047',
  successLight: '#E8F5E9',
  danger:       '#E53935',
  dangerLight:  '#FFEBEE',
  warning:      '#FB8C00',
  warningLight: '#FFF3E0',
  info:         '#0288D1',
  infoLight:    '#E1F5FE',

  // Neutral — dark theme
  white:        '#FFFFFF',
  background:   '#060F08',
  surface:      '#0D1A10',
  border:       'rgba(178,208,84,0.30)',
  muted:        '#6B7A6D',
  text:         '#EFF4EE',
  textMuted:    'rgba(239,244,238,0.5)',
  dark:         '#1A2318',
  light:        '#EFF4EE',
};

export const Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:          Colors.primary,
    secondary:        Colors.secondary,
    background:       '#060F08',
    surface:          '#0D1A10',
    surfaceVariant:   '#0A1608',
    error:            Colors.danger,
    onPrimary:        '#071209',
    onBackground:     '#EFF4EE',
    onSurface:        '#EFF4EE',
    onSurfaceVariant: 'rgba(239,244,238,0.7)',
    outline:          'rgba(178,208,84,0.30)',
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
