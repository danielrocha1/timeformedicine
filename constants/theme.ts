import { Platform } from 'react-native';

export const palette = {
  primary: '#3A8F9E',
  primaryDark: '#2D7280',
  secondary: '#6BCB9A',
  warning: '#E8A838',
  danger: '#D9534F',
} as const;

export const Colors = {
  light: {
    text: '#1A2B34',
    textSecondary: '#5A6B75',
    background: '#F4F9FB',
    card: '#FFFFFF',
    border: '#D8E8ED',
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    secondary: palette.secondary,
    warning: palette.warning,
    danger: palette.danger,
    success: palette.secondary,
    tabBar: '#FFFFFF',
    inputBackground: '#FFFFFF',
    stockHigh: palette.secondary,
    stockLow: palette.warning,
    stockEmpty: palette.danger,
  },
  dark: {
    text: '#E8F4F8',
    textSecondary: '#9BB0BA',
    background: '#152028',
    card: '#1E2D38',
    border: '#2E4050',
    primary: '#4DAFBF',
    primaryDark: '#3A8F9E',
    secondary: '#6BCB9A',
    warning: '#E8A838',
    danger: '#E0706D',
    success: palette.secondary,
    tabBar: '#1E2D38',
    inputBackground: '#253540',
    stockHigh: palette.secondary,
    stockLow: palette.warning,
    stockEmpty: palette.danger,
  },
} as const;

export type ThemeColors = (typeof Colors)[keyof typeof Colors];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'System', rounded: 'System' },
  android: { sans: 'Roboto', rounded: 'Roboto' },
  default: { sans: 'System', rounded: 'System' },
})!;

export const LOW_STOCK_DOSE_THRESHOLD = 3;
export const QUICK_INTERVALS = [6, 8, 12, 24] as const;
