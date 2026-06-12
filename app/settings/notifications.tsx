import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function NotificationSettingsScreen() {
  const colors = useThemeColors();
  const { settings, updateNotifications } = useSettings();
  const n = settings.notifications;

  return (
    <>
      <Stack.Screen options={{ title: 'Notificações' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <SettingsSection title="Alertas">
          <SettingsRow icon="volume-high-outline" label="Som" switchValue={n.soundEnabled} onSwitchChange={(v) => void updateNotifications({ soundEnabled: v })} />
          <SettingsRow icon="phone-portrait-outline" label="Vibração" switchValue={n.vibrationEnabled} onSwitchChange={(v) => void updateNotifications({ vibrationEnabled: v })} />
        </SettingsSection>
        <Input
          label="Título do alerta"
          value={n.alertTitle}
          onChangeText={(v) => void updateNotifications({ alertTitle: v })}
          placeholder="Hora do seu medicamento 💊"
        />
        <SettingsSection title="Horário silencioso">
          <SettingsRow icon="moon-outline" label="Ativar horário silencioso" switchValue={n.quietHoursEnabled} onSwitchChange={(v) => void updateNotifications({ quietHoursEnabled: v })} />
          <Input label="Início (HH:MM)" value={n.quietHoursStart} onChangeText={(v) => void updateNotifications({ quietHoursStart: v })} />
          <Input label="Fim (HH:MM)" value={n.quietHoursEnd} onChangeText={(v) => void updateNotifications({ quietHoursEnd: v })} />
          <SettingsRow icon="notifications-off-outline" label="Sem vibração no silencioso" switchValue={n.quietHoursSilentVibration} onSwitchChange={(v) => void updateNotifications({ quietHoursSilentVibration: v })} />
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
});
