import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppSettings } from '@/types';

const SETTINGS_KEY = '@timeformedicine/app-settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  profile: {
    fullName: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  themeMode: 'system',
  language: 'pt-BR',
  timeFormat: '24h',
  notifications: {
    soundEnabled: true,
    vibrationEnabled: true,
    alertTitle: 'Hora do seu medicamento 💊',
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    quietHoursSilentVibration: true,
  },
  security: {
    pinEnabled: false,
    biometricEnabled: false,
    autoLockMinutes: 5,
  },
  accessibility: {
    largeText: false,
    highContrast: false,
    reduceMotion: false,
  },
  onboardingCompleted: false,
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      profile: { ...DEFAULT_APP_SETTINGS.profile, ...parsed.profile },
      notifications: { ...DEFAULT_APP_SETTINGS.notifications, ...parsed.notifications },
      security: { ...DEFAULT_APP_SETTINGS.security, ...parsed.security },
      accessibility: { ...DEFAULT_APP_SETTINGS.accessibility, ...parsed.accessibility },
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function isWithinQuietHours(now: Date, start: string, end: string): boolean {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) {
    return minutes >= startMin && minutes < endMin;
  }
  return minutes >= startMin || minutes < endMin;
}
