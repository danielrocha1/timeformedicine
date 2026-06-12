import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';

import type { ThemeColors } from '@/constants/theme';

/** Mantém a barra de navegação Android abaixo do conteúdo do app */
export function useAndroidNavigationBar(colors: ThemeColors, isDark: boolean): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void (async () => {
      try {
        await NavigationBar.setPositionAsync('relative');
        await NavigationBar.setBackgroundColorAsync(colors.tabBar);
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      } catch {
        // Expo Go pode não suportar todas as APIs
      }
    })();
  }, [colors.tabBar, isDark]);
}
