import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Altura base da tab bar (ícones + labels) */
export const TAB_BAR_BASE_HEIGHT = 56;

/** Altura total da tab bar incluindo safe area inferior (botões virtuais Android) */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + insets.bottom;
}
