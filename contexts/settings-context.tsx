import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { setNotificationPrefs } from '@/lib/notification-prefs-store';
import {
  DEFAULT_APP_SETTINGS,
  getAppSettings,
  saveAppSettings,
} from '@/lib/user-settings';
import type {
  AccessibilityPreferences,
  AppSettings,
  NotificationPreferences,
  SecurityPreferences,
  ThemeMode,
  TimeFormat,
  UserProfile,
} from '@/types';

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  effectiveTheme: 'light' | 'dark';
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setTimeFormat: (format: TimeFormat) => Promise<void>;
  updateNotifications: (patch: Partial<NotificationPreferences>) => Promise<void>;
  updateSecurity: (patch: Partial<SecurityPreferences>) => Promise<void>;
  updateAccessibility: (patch: Partial<AccessibilityPreferences>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSettings(await getAppSettings());
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    setNotificationPrefs(settings.notifications);
  }, [settings.notifications]);

  const persist = useCallback(async (next: AppSettings) => {
    await saveAppSettings(next);
    setSettings(next);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const now = new Date().toISOString();
      await persist({
        ...settings,
        profile: {
          ...settings.profile,
          ...patch,
          updatedAt: now,
          createdAt: settings.profile.createdAt || now,
        },
      });
    },
    [persist, settings],
  );

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => persist({ ...settings, themeMode: mode }),
    [persist, settings],
  );

  const setTimeFormat = useCallback(
    async (format: TimeFormat) => persist({ ...settings, timeFormat: format }),
    [persist, settings],
  );

  const updateNotifications = useCallback(
    async (patch: Partial<NotificationPreferences>) =>
      persist({ ...settings, notifications: { ...settings.notifications, ...patch } }),
    [persist, settings],
  );

  const updateSecurity = useCallback(
    async (patch: Partial<SecurityPreferences>) =>
      persist({ ...settings, security: { ...settings.security, ...patch } }),
    [persist, settings],
  );

  const updateAccessibility = useCallback(
    async (patch: Partial<AccessibilityPreferences>) =>
      persist({ ...settings, accessibility: { ...settings.accessibility, ...patch } }),
    [persist, settings],
  );

  const completeOnboarding = useCallback(
    async () => persist({ ...settings, onboardingCompleted: true }),
    [persist, settings],
  );

  const effectiveTheme = useMemo((): 'light' | 'dark' => {
    if (settings.themeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return settings.themeMode;
  }, [settings.themeMode, systemScheme]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      effectiveTheme,
      updateProfile,
      setThemeMode,
      setTimeFormat,
      updateNotifications,
      updateSecurity,
      updateAccessibility,
      completeOnboarding,
      refresh,
    }),
    [
      settings,
      loading,
      effectiveTheme,
      updateProfile,
      setThemeMode,
      setTimeFormat,
      updateNotifications,
      updateSecurity,
      updateAccessibility,
      completeOnboarding,
      refresh,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings deve ser usado dentro de SettingsProvider');
  return ctx;
}
