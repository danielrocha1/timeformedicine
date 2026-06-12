import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/toast-context';
import { useSettings } from '@/contexts/settings-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useState } from 'react';

export default function ProfileSettingsScreen() {
  const colors = useThemeColors();
  const { settings, updateProfile, completeOnboarding } = useSettings();
  const { showToast } = useToast();
  const [name, setName] = useState(settings.profile.fullName);
  const [email, setEmail] = useState(settings.profile.email ?? '');

  const save = async () => {
    if (!name.trim()) {
      showToast('Informe seu nome completo.', 'error');
      return;
    }
    await updateProfile({ fullName: name.trim(), email: email.trim() || undefined });
    if (!settings.onboardingCompleted) await completeOnboarding();
    showToast('Perfil atualizado!', 'success');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Meu perfil' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Suas informações são armazenadas com segurança neste dispositivo.
        </Text>
        <Input label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome" />
        <Input label="E-mail (opcional)" value={email} onChangeText={setEmail} placeholder="email@exemplo.com" keyboardType="email-address" />
        <Button label="Salvar perfil" onPress={() => void save()} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
  hint: { fontSize: 14, marginBottom: Spacing.lg },
});
