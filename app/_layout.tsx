import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { MedicationsProvider } from '@/contexts/medications-context';
import { ToastProvider } from '@/contexts/toast-context';
import { useAndroidNavigationBar } from '@/hooks/use-android-navigation-bar';
import { setupNotificationHandler } from '@/lib/notifications';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useAndroidNavigationBar(colors, colorScheme === 'dark');

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <MedicationsProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.primary,
              headerTitleStyle: { fontWeight: '700', color: colors.text },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="medication/new" options={{ presentation: 'modal', title: 'Novo medicamento' }} />
            <Stack.Screen name="medication/[id]" options={{ title: 'Medicamento' }} />
          </Stack>
        </MedicationsProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
