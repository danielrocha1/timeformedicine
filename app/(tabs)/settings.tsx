import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { getCurrentDeviceInfo } from '@/lib/security-service';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const { settings } = useSettings();
  const { lockApp, securityRequired } = useAuth();
  const device = getCurrentDeviceInfo();

  const themeLabel =
    settings.themeMode === 'system' ? 'Automático' : settings.themeMode === 'dark' ? 'Escuro' : 'Claro';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.lg, paddingHorizontal: Spacing.md }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Perfil e configurações</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {settings.profile.fullName || 'Configure seu perfil'}
        </Text>
      </View>

      <SettingsSection title="Conta">
        <SettingsRow
          icon="person-outline"
          label="Meu perfil"
          subtitle="Nome e dados pessoais"
          onPress={() => router.push('/settings/profile' as Href)}
        />
        <SettingsRow
          icon="phone-portrait-outline"
          label="Dispositivo conectado"
          subtitle={device.name}
          value={device.platform}
        />
      </SettingsSection>

      <SettingsSection title="Preferências">
        <SettingsRow icon="color-palette-outline" label="Tema" value={themeLabel} onPress={() => router.push('/settings/accessibility' as Href)} />
        <SettingsRow icon="time-outline" label="Formato de horário" value={settings.timeFormat} onPress={() => router.push('/settings/accessibility' as Href)} />
        <SettingsRow icon="accessibility-outline" label="Acessibilidade" onPress={() => router.push('/settings/accessibility' as Href)} />
      </SettingsSection>

      <SettingsSection title="Notificações">
        <SettingsRow icon="notifications-outline" label="Alertas e sons" onPress={() => router.push('/settings/notifications' as Href)} />
      </SettingsSection>

      <SettingsSection title="Segurança">
        <SettingsRow icon="shield-checkmark-outline" label="Biometria e bloqueio" onPress={() => router.push('/settings/security' as Href)} />
        {securityRequired && (
          <SettingsRow icon="lock-closed-outline" label="Bloquear agora" onPress={() => void lockApp()} danger />
        )}
      </SettingsSection>

      <SettingsSection title="Futuro">
        <SettingsRow icon="document-text-outline" label="Relatórios médicos" subtitle="Em breve" />
        <SettingsRow icon="people-outline" label="Compartilhamento familiar" subtitle="Em breve" />
        <SettingsRow icon="medkit-outline" label="Integração profissional" subtitle="Em breve" />
      </SettingsSection>

      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        Time for Medicine v1.0 · Seus dados ficam neste dispositivo
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, marginTop: 4 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: Spacing.lg, paddingHorizontal: Spacing.lg },
});
