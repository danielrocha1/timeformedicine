import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { LOW_STOCK_DOSE_THRESHOLD } from '@/constants/theme';
import { getRemainingDoses } from '@/lib/medication-utils';
import type { Medication } from '@/types';

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medications', {
      name: 'Lembretes de medicamentos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('stock-alerts', {
      name: 'Alertas de estoque',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelNotification(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // já disparada ou inexistente
  }
}

export async function scheduleDoseNotification(medication: Medication): Promise<string | undefined> {
  const nextDate = new Date(medication.nextDoseAt);
  if (nextDate.getTime() <= Date.now()) return undefined;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '💊 Hora do medicamento',
      body: `${medication.name} — ${medication.dosage}`,
      data: { medicationId: medication.id, type: 'dose' },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'medications' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextDate,
    },
  });
}

export async function scheduleLowStockNotification(
  medication: Medication,
): Promise<string | undefined> {
  const remaining = getRemainingDoses(medication);
  if (remaining >= LOW_STOCK_DOSE_THRESHOLD || medication.stockTotal <= 0) return undefined;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Estoque baixo',
      body: `${medication.name}: restam apenas ${remaining} dose${remaining !== 1 ? 's' : ''}. Reponha em breve!`,
      data: { medicationId: medication.id, type: 'low-stock' },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'stock-alerts' } : {}),
    },
    trigger: null,
  });
}

export async function syncMedicationNotifications(
  medication: Medication,
  previous?: Pick<Medication, 'doseNotificationId' | 'lowStockNotificationId'>,
): Promise<Medication> {
  await cancelNotification(previous?.doseNotificationId);
  await cancelNotification(previous?.lowStockNotificationId);

  const doseNotificationId = await scheduleDoseNotification(medication);
  const lowStockNotificationId = await scheduleLowStockNotification(medication);

  return { ...medication, doseNotificationId, lowStockNotificationId };
}

export async function cancelMedicationNotifications(medication: Medication): Promise<void> {
  await cancelNotification(medication.doseNotificationId);
  await cancelNotification(medication.lowStockNotificationId);
}
