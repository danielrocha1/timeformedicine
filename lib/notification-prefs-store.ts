import type { NotificationPreferences } from '@/types';
import { DEFAULT_APP_SETTINGS } from '@/lib/user-settings';

let currentPrefs: NotificationPreferences = DEFAULT_APP_SETTINGS.notifications;

export function setNotificationPrefs(prefs: NotificationPreferences): void {
  currentPrefs = prefs;
}

export function getNotificationPrefs(): NotificationPreferences {
  return currentPrefs;
}
