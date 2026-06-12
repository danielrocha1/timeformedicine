import { Stack } from 'expo-router';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { ThemeMode, TimeFormat } from '@/types';

export default function AccessibilitySettingsScreen() {
  const colors = useThemeColors();
  const { settings, setThemeMode, setTimeFormat, updateAccessibility } = useSettings();

  const pickTheme = () => {
    Alert.alert('Tema', 'Escolha o tema do aplicativo', [
      { text: 'Automático', onPress: () => void setThemeMode('system') },
      { text: 'Claro', onPress: () => void setThemeMode('light') },
      { text: 'Escuro', onPress: () => void setThemeMode('dark') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const pickTimeFormat = () => {
    Alert.alert('Formato de horário', undefined, [
      { text: '24 horas', onPress: () => void setTimeFormat('24h') },
      { text: '12 horas', onPress: () => void setTimeFormat('12h') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const themeLabel: Record<ThemeMode, string> = {
    system: 'Automático',
    light: 'Claro',
    dark: 'Escuro',
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Preferências' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <SettingsSection title="Interface">
          <SettingsRow icon="color-palette-outline" label="Tema" value={themeLabel[settings.themeMode]} onPress={pickTheme} />
          <SettingsRow icon="time-outline" label="Formato de horário" value={settings.timeFormat} onPress={pickTimeFormat} />
          <SettingsRow icon="language-outline" label="Idioma" value="Português (BR)" />
        </SettingsSection>
        <SettingsSection title="Acessibilidade">
          <SettingsRow icon="text-outline" label="Texto grande" switchValue={settings.accessibility.largeText} onSwitchChange={(v) => void updateAccessibility({ largeText: v })} />
          <SettingsRow icon="contrast-outline" label="Alto contraste" switchValue={settings.accessibility.highContrast} onSwitchChange={(v) => void updateAccessibility({ highContrast: v })} />
          <SettingsRow icon="accessibility-outline" label="Reduzir animações" switchValue={settings.accessibility.reduceMotion} onSwitchChange={(v) => void updateAccessibility({ reduceMotion: v })} />
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
});
