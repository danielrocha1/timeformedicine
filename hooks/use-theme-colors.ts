import { useSettings } from '@/contexts/settings-context';
import { Colors, type ThemeColors } from '@/constants/theme';

export function useThemeColors(): ThemeColors {
  const { effectiveTheme, settings } = useSettings();
  const base = Colors[effectiveTheme];
  if (settings.accessibility.highContrast) {
    return {
      ...base,
      border: effectiveTheme === 'dark' ? '#FFFFFF44' : '#00000033',
      text: effectiveTheme === 'dark' ? '#FFFFFF' : '#000000',
    } as unknown as ThemeColors;
  }
  return base;
}

export function useFontScale(): number {
  const { settings } = useSettings();
  return settings.accessibility.largeText ? 1.15 : 1;
}
