import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';

export function LockGate({ children }: { children: React.ReactNode }) {
  const { isLocked, securityRequired, unlockWithPin, unlockWithBiometric, biometricLabel, biometricAvailable } =
    useAuth();
  const { effectiveTheme, settings } = useSettings();
  const colors = Colors[effectiveTheme];
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLocked && settings.security.biometricEnabled && biometricAvailable) {
      void unlockWithBiometric();
    }
  }, [isLocked, settings.security.biometricEnabled, biometricAvailable, unlockWithBiometric]);

  if (!securityRequired || !isLocked) return <>{children}</>;

  const handleUnlock = async () => {
    const ok = await unlockWithPin(pin);
    if (ok) {
      setPin('');
      setError('');
    } else {
      setError('PIN incorreto. Tente novamente.');
    }
  };

  return (
    <>
      {children}
      <Modal visible animationType="fade" transparent={false}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Ionicons name="lock-closed" size={56} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Time for Medicine</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Digite seu PIN para continuar
          </Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="••••"
            placeholderTextColor={colors.textSecondary}
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <Button label="Desbloquear" onPress={() => void handleUnlock()} style={styles.btn} />
          {settings.security.biometricEnabled && biometricAvailable && (
            <Pressable onPress={() => void unlockWithBiometric()} style={styles.bioBtn}>
              <Ionicons name="finger-print" size={22} color={colors.primary} />
              <Text style={[styles.bioText, { color: colors.primary }]}>Usar {biometricLabel}</Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  title: { fontSize: 26, fontWeight: '800', marginTop: Spacing.lg },
  subtitle: { fontSize: 15, marginTop: Spacing.sm, marginBottom: Spacing.lg, textAlign: 'center' },
  input: {
    width: '100%',
    maxWidth: 280,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
  },
  error: { marginTop: Spacing.sm, fontSize: 14, fontWeight: '600' },
  btn: { marginTop: Spacing.lg, width: '100%', maxWidth: 280 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  bioText: { fontSize: 16, fontWeight: '600' },
});
