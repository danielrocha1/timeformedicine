import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function SecuritySettingsScreen() {
  const colors = useThemeColors();
  const { settings, updateSecurity } = useSettings();
  const { setupPin, clearPin, biometricLabel, biometricAvailable } = useAuth();
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const savePin = async () => {
    if (pin.length < 4) {
      Alert.alert('PIN inválido', 'Use pelo menos 4 dígitos.');
      return;
    }
    if (pin !== pinConfirm) {
      Alert.alert('PIN não confere', 'Digite o mesmo PIN nos dois campos.');
      return;
    }
    await setupPin(pin);
    await updateSecurity({ pinEnabled: true });
    setPin('');
    setPinConfirm('');
    Alert.alert('PIN configurado', 'Seu acesso está protegido.');
  };

  const removePin = async () => {
    await clearPin();
    await updateSecurity({ pinEnabled: false, biometricEnabled: false });
    Alert.alert('PIN removido', 'Proteção por PIN desativada.');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Segurança' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <SettingsSection title="Biometria">
          <SettingsRow
            icon="finger-print-outline"
            label={biometricLabel}
            subtitle={biometricAvailable ? 'Disponível neste dispositivo' : 'Não disponível'}
            switchValue={settings.security.biometricEnabled}
            onSwitchChange={(v) => {
              if (v && !settings.security.pinEnabled) {
                Alert.alert('Configure um PIN primeiro', 'A biometria exige um PIN de backup.');
                return;
              }
              void updateSecurity({ biometricEnabled: v });
            }}
          />
        </SettingsSection>
        <SettingsSection title="PIN de acesso">
          <Input label="Novo PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
          <Input label="Confirmar PIN" value={pinConfirm} onChangeText={setPinConfirm} keyboardType="number-pad" secureTextEntry maxLength={6} />
          <Button label="Salvar PIN" onPress={() => void savePin()} />
          {settings.security.pinEnabled && (
            <Button label="Remover PIN" variant="danger" onPress={() => void removePin()} style={{ marginTop: Spacing.sm }} />
          )}
        </SettingsSection>
        <SettingsSection title="Bloqueio automático">
          <SettingsRow
            icon="timer-outline"
            label="Bloquear após inatividade"
            subtitle={`${settings.security.autoLockMinutes} minutos`}
          />
          <Input
            label="Minutos até bloquear"
            value={String(settings.security.autoLockMinutes)}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!Number.isNaN(n) && n >= 1 && n <= 60) void updateSecurity({ autoLockMinutes: n });
            }}
            keyboardType="number-pad"
          />
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
});
