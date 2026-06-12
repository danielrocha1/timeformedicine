import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockGate } from '@/components/lock-gate';
import { IntelligenceOverlays } from '@/components/intelligence-overlays';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/contexts/auth-context';
import { MedicationsProvider } from '@/contexts/medications-context';
import { SettingsProvider, useSettings } from '@/contexts/settings-context';
import { ToastProvider } from '@/contexts/toast-context';
import { useAlarmReconciler, useAlarmResponseHandler } from '@/hooks/use-alarm-handlers';
import { useAndroidNavigationBar } from '@/hooks/use-android-navigation-bar';
import { setupNotificationHandler } from '@/lib/notifications';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications` functionality is not fully supported in Expo Go',
]);

function AlarmSystemBootstrap() {
  useAlarmResponseHandler();
  useAlarmReconciler();
  return <IntelligenceOverlays />;
}

function RootNavigator() {
  const { effectiveTheme } = useSettings();
  const colors = Colors[effectiveTheme];

  useAndroidNavigationBar(colors, effectiveTheme === 'dark');

  return (
    <>
      <AlarmSystemBootstrap />
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="medication/new" options={{ presentation: 'modal', title: 'Novo medicamento' }} />
        <Stack.Screen name="medication/[id]" options={{ title: 'Medicamento' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setupNotificationHandler();
  }, []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ToastProvider>
          <AuthProvider>
            <MedicationsProvider>
              <LockGate>
                <RootNavigator />
              </LockGate>
            </MedicationsProvider>
          </AuthProvider>
        </ToastProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
