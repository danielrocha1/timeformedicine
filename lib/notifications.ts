import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ALARM_FOLLOWUP_DELAY_MINUTES,
  DEFAULT_ALARM_SNOOZE_MINUTES,
  DEFAULT_ALARM_TOLERANCE_MINUTES,
  LOW_STOCK_DOSE_THRESHOLD,
} from '@/constants/theme';
import { getNotificationPrefs } from '@/lib/notification-prefs-store';
import { isWithinQuietHours } from '@/lib/user-settings';
import { getSlotKey } from '@/lib/dose-intelligence';
import { getAlarmToleranceMs, getSchedulableOccurrences } from '@/lib/dose-occurrences';
import { formatAmountPerDose, getRemainingDoses } from '@/lib/medication-utils';
import type { AlarmActionId, DoseOccurrence, Medication } from '@/types';

const HORIZON_HOURS = 48;

export function isNativeNotificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export const ALARM_CATEGORY_PRIMARY = 'DOSE_ALARM_PRIMARY';
export const ALARM_CATEGORY_FOLLOWUP = 'DOSE_ALARM_FOLLOWUP';
export const ALARM_CATEGORY_GROUP = 'DOSE_ALARM_GROUP';

export interface GroupAlarmItem {
  medicationId: string;
  occurrenceId: string;
  medicationName: string;
  dosage: string;
}

export interface GroupAlarmNotificationPayload {
  type: 'dose-group-primary';
  groupSlotKey: string;
  scheduledFor: string;
  items: GroupAlarmItem[];
}

export type AnyAlarmPayload = AlarmNotificationPayload | GroupAlarmNotificationPayload;

export interface AlarmNotificationPayload {
  type: 'dose-primary' | 'dose-followup' | 'dose-missed-info';
  medicationId: string;
  occurrenceId: string;
  scheduledFor: string;
  action?: AlarmActionId;
}

export function setupNotificationHandler(): void {
  if (!isNativeNotificationsSupported()) return;
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

export async function setupAlarmCategories(): Promise<void> {
  if (!isNativeNotificationsSupported()) return;
  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_PRIMARY, [
    {
      identifier: 'TOMEI_AGORA',
      buttonTitle: '✅ Tomei agora',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'LEMBRAR_DEPOIS',
      buttonTitle: '⏳ Lembrar depois',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'ESQUECI',
      buttonTitle: '❌ Esqueci',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_FOLLOWUP, [
    {
      identifier: 'TOMEI',
      buttonTitle: '✅ Tomei',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'ESQUECI_FOLLOWUP',
      buttonTitle: '❌ Esqueci',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_GROUP, [
    {
      identifier: 'TOMEI_TODOS',
      buttonTitle: '✅ Marcar todos como tomados',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'REGISTRAR_INDIVIDUAL',
      buttonTitle: '📋 Registrar individualmente',
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isNativeNotificationsSupported()) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dose-alarms', {
      name: 'Alarmes de medicamentos',
      description: 'Lembretes prioritários com ações rápidas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 600],
      lightColor: '#2563EB',
      sound: 'default',
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync('dose-followup', {
      name: 'Confirmação de dose',
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

  await setupAlarmCategories();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
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

function primaryAlarmId(occurrenceId: string): string {
  return `alarm-p-${occurrenceId}`;
}

function followupAlarmId(occurrenceId: string): string {
  return `alarm-f-${occurrenceId}`;
}

function missedInfoId(occurrenceId: string): string {
  return `alarm-m-${occurrenceId}`;
}

function resolveAlertPresentation(triggerDate: Date): {
  title: string;
  sound: string | boolean | undefined;
  priority: Notifications.AndroidNotificationPriority;
} {
  const prefs = getNotificationPrefs();
  const quiet =
    prefs.quietHoursEnabled &&
    isWithinQuietHours(triggerDate, prefs.quietHoursStart, prefs.quietHoursEnd);

  return {
    title: prefs.alertTitle,
    sound: prefs.soundEnabled && !quiet ? 'default' : false,
    priority: quiet
      ? Notifications.AndroidNotificationPriority.DEFAULT
      : Notifications.AndroidNotificationPriority.MAX,
  };
}

function buildDoseBody(medication: Medication): string {
  const doseLine = formatAmountPerDose(medication.pillsPerDose, medication.medicationType);
  return `Medicamento:\n${medication.name} ${medication.dosage}\n\nDose:\n${doseLine.replace(' por dose', '')}`;
}

export async function cancelOccurrenceAlarms(occurrenceId: string): Promise<void> {
  await Promise.all([
    cancelNotification(primaryAlarmId(occurrenceId)),
    cancelNotification(followupAlarmId(occurrenceId)),
    cancelNotification(missedInfoId(occurrenceId)),
  ]);
}

export async function scheduleAlarmChain(
  medication: Medication,
  occurrence: DoseOccurrence,
): Promise<void> {
  if (!isNativeNotificationsSupported()) return;
  const scheduledFor = new Date(occurrence.scheduledFor);
  const now = Date.now();
  const toleranceMs = getAlarmToleranceMs(medication);
  const followupAt = new Date(
    scheduledFor.getTime() + ALARM_FOLLOWUP_DELAY_MINUTES * 60 * 1000,
  );
  const missedAt = new Date(scheduledFor.getTime() + toleranceMs);

  await cancelOccurrenceAlarms(occurrence.id);

  if (scheduledFor.getTime() > now) {
    const alert = resolveAlertPresentation(scheduledFor);
    await Notifications.scheduleNotificationAsync({
      identifier: primaryAlarmId(occurrence.id),
      content: {
        title: alert.title,
        body: buildDoseBody(medication),
        subtitle: medication.name,
        data: {
          type: 'dose-primary',
          medicationId: medication.id,
          occurrenceId: occurrence.id,
          scheduledFor: occurrence.scheduledFor,
        } satisfies AlarmNotificationPayload,
        sound: alert.sound,
        priority: alert.priority,
        sticky: Platform.OS === 'android',
        categoryIdentifier: ALARM_CATEGORY_PRIMARY,
        ...(Platform.OS === 'android' ? { channelId: 'dose-alarms' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledFor,
        channelId: Platform.OS === 'android' ? 'dose-alarms' : undefined,
      },
    });
  }

  if (followupAt.getTime() > now && followupAt.getTime() < missedAt.getTime()) {
    await Notifications.scheduleNotificationAsync({
      identifier: followupAlarmId(occurrence.id),
      content: {
        title: 'Você tomou seu medicamento?',
        body: `${medication.name} ${medication.dosage} — confirme ou marque como esquecida.`,
        data: {
          type: 'dose-followup',
          medicationId: medication.id,
          occurrenceId: occurrence.id,
          scheduledFor: occurrence.scheduledFor,
        } satisfies AlarmNotificationPayload,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: ALARM_CATEGORY_FOLLOWUP,
        ...(Platform.OS === 'android' ? { channelId: 'dose-followup' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: followupAt,
        channelId: Platform.OS === 'android' ? 'dose-followup' : undefined,
      },
    });
  }

  if (missedAt.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: missedInfoId(occurrence.id),
      content: {
        title: 'Dose esquecida',
        body: `${medication.name} foi marcada como esquecida automaticamente.`,
        data: {
          type: 'dose-missed-info',
          medicationId: medication.id,
          occurrenceId: occurrence.id,
          scheduledFor: occurrence.scheduledFor,
          action: 'ESQUECI',
        } satisfies AlarmNotificationPayload,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'dose-followup' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: missedAt,
        channelId: Platform.OS === 'android' ? 'dose-followup' : undefined,
      },
    });
  }
}

function groupAlarmId(slotKey: string): string {
  return `alarm-g-${slotKey}`;
}

function buildGroupBody(items: GroupAlarmItem[]): string {
  return items.map((i) => `💊 ${i.medicationName} ${i.dosage}`).join('\n');
}

export async function scheduleGroupAlarmChain(
  items: Array<{ medication: Medication; occurrence: DoseOccurrence }>,
  slotKey: string,
): Promise<void> {
  if (!isNativeNotificationsSupported()) return;
  if (items.length === 0) return;
  const scheduledFor = new Date(items[0].occurrence.scheduledFor);
  const now = Date.now();

  for (const { occurrence } of items) {
    await cancelNotification(primaryAlarmId(occurrence.id));
  }

  if (scheduledFor.getTime() <= now) return;

  const payloadItems: GroupAlarmItem[] = items.map(({ medication, occurrence }) => ({
    medicationId: medication.id,
    occurrenceId: occurrence.id,
    medicationName: medication.name,
    dosage: medication.dosage,
  }));

  await Notifications.scheduleNotificationAsync({
    identifier: groupAlarmId(slotKey),
    content: {
      title: `Você possui ${items.length} medicamentos agora`,
      body: buildGroupBody(payloadItems),
      data: {
        type: 'dose-group-primary',
        groupSlotKey: slotKey,
        scheduledFor: items[0].occurrence.scheduledFor,
        items: payloadItems,
      } satisfies GroupAlarmNotificationPayload,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      sticky: Platform.OS === 'android',
      categoryIdentifier: ALARM_CATEGORY_GROUP,
      ...(Platform.OS === 'android' ? { channelId: 'dose-alarms' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledFor,
      channelId: Platform.OS === 'android' ? 'dose-alarms' : undefined,
    },
  });

  for (const { medication, occurrence } of items) {
    const toleranceMs = getAlarmToleranceMs(medication);
    const followupAt = new Date(
      scheduledFor.getTime() + ALARM_FOLLOWUP_DELAY_MINUTES * 60 * 1000,
    );
    const missedAt = new Date(scheduledFor.getTime() + toleranceMs);

    if (followupAt.getTime() > now && followupAt.getTime() < missedAt.getTime()) {
      await Notifications.scheduleNotificationAsync({
        identifier: followupAlarmId(occurrence.id),
        content: {
          title: 'Você tomou seu medicamento?',
          body: `${medication.name} ${medication.dosage} — confirme ou marque como esquecida.`,
          data: {
            type: 'dose-followup',
            medicationId: medication.id,
            occurrenceId: occurrence.id,
            scheduledFor: occurrence.scheduledFor,
          } satisfies AlarmNotificationPayload,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: ALARM_CATEGORY_FOLLOWUP,
          ...(Platform.OS === 'android' ? { channelId: 'dose-followup' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: followupAt,
          channelId: Platform.OS === 'android' ? 'dose-followup' : undefined,
        },
      });
    }

    if (missedAt.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: missedInfoId(occurrence.id),
        content: {
          title: 'Dose esquecida',
          body: `${medication.name} foi marcada como esquecida automaticamente.`,
          data: {
            type: 'dose-missed-info',
            medicationId: medication.id,
            occurrenceId: occurrence.id,
            scheduledFor: occurrence.scheduledFor,
            action: 'ESQUECI',
          } satisfies AlarmNotificationPayload,
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'dose-followup' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: missedAt,
          channelId: Platform.OS === 'android' ? 'dose-followup' : undefined,
        },
      });
    }
  }
}

export async function syncAllGroupedAlarmNotifications(
  medications: Medication[],
  occurrences: DoseOccurrence[],
): Promise<Medication[]> {
  if (!isNativeNotificationsSupported()) return medications;
  const now = new Date();
  const horizonMs = HORIZON_HOURS * 60 * 60 * 1000;

  for (const med of medications) {
    await cancelMedicationNotifications(med, occurrences);
  }

  const schedulable: Array<{ medication: Medication; occurrence: DoseOccurrence }> = [];
  for (const med of medications) {
    if (med.stockTotal <= 0) continue;
    for (const occ of getSchedulableOccurrences(occurrences, med.id, horizonMs, now)) {
      schedulable.push({ medication: med, occurrence: occ });
    }
  }

  const groups = new Map<string, Array<{ medication: Medication; occurrence: DoseOccurrence }>>();
  for (const item of schedulable) {
    const key = getSlotKey(item.occurrence.scheduledFor);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  for (const [slotKey, items] of groups) {
    if (items.length === 1) {
      await scheduleAlarmChain(items[0].medication, items[0].occurrence);
    } else {
      await scheduleGroupAlarmChain(items, slotKey);
    }
  }

  const updatedMeds: Medication[] = [];
  for (const med of medications) {
    const lowStockNotificationId = await scheduleLowStockNotification(med);
    const firstPending = getSchedulableOccurrences(occurrences, med.id, horizonMs, now)[0];
    updatedMeds.push({
      ...med,
      doseNotificationId: firstPending ? primaryAlarmId(firstPending.id) : undefined,
      lowStockNotificationId,
    });
  }

  return updatedMeds;
}

export function parseGroupAlarmPayload(data: unknown): GroupAlarmNotificationPayload | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.type !== 'dose-group-primary') return null;
  if (typeof d.groupSlotKey !== 'string' || typeof d.scheduledFor !== 'string') return null;
  if (!Array.isArray(d.items)) return null;
  const items = d.items.filter(
    (item): item is GroupAlarmItem =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as GroupAlarmItem).medicationId === 'string' &&
      typeof (item as GroupAlarmItem).occurrenceId === 'string',
  );
  if (items.length === 0) return null;
  return {
    type: 'dose-group-primary',
    groupSlotKey: d.groupSlotKey,
    scheduledFor: d.scheduledFor,
    items,
  };
}

export function parseAnyAlarmPayload(data: unknown): AnyAlarmPayload | null {
  return parseGroupAlarmPayload(data) ?? parseAlarmPayload(data);
}

export async function scheduleLowStockNotification(
  medication: Medication,
): Promise<string | undefined> {
  if (!isNativeNotificationsSupported()) return undefined;
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

export async function syncMedicationAlarmNotifications(
  medication: Medication,
  occurrences: DoseOccurrence[],
  previous?: Pick<Medication, 'lowStockNotificationId'>,
): Promise<Medication> {
  if (!isNativeNotificationsSupported()) return medication;
  await cancelNotification(previous?.lowStockNotificationId);

  const horizonMs = HORIZON_HOURS * 60 * 60 * 1000;
  const schedulable = getSchedulableOccurrences(occurrences, medication.id, horizonMs);

  for (const occ of schedulable) {
    await scheduleAlarmChain(medication, occ);
  }

  const lowStockNotificationId = await scheduleLowStockNotification(medication);
  const firstPending = schedulable[0];

  return {
    ...medication,
    doseNotificationId: firstPending ? primaryAlarmId(firstPending.id) : undefined,
    lowStockNotificationId,
  };
}

export async function cancelMedicationNotifications(
  medication: Medication,
  occurrences: DoseOccurrence[] = [],
): Promise<void> {
  await cancelNotification(medication.doseNotificationId);
  await cancelNotification(medication.lowStockNotificationId);

  const medOccurrences = occurrences.filter((o) => o.medicationId === medication.id);
  for (const occ of medOccurrences) {
    await cancelOccurrenceAlarms(occ.id);
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      const data = parseAlarmPayload(notification.content.data);
      if (data?.medicationId === medication.id) {
        await cancelNotification(notification.identifier);
      }
    }
  } catch {
    // ok
  }
}

export function parseAlarmPayload(data: unknown): AlarmNotificationPayload | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (
    typeof d.medicationId !== 'string' ||
    typeof d.occurrenceId !== 'string' ||
    typeof d.scheduledFor !== 'string'
  ) {
    return null;
  }
  const type = d.type as AlarmNotificationPayload['type'];
  if (type !== 'dose-primary' && type !== 'dose-followup' && type !== 'dose-missed-info') {
    return null;
  }
  return {
    type,
    medicationId: d.medicationId,
    occurrenceId: d.occurrenceId,
    scheduledFor: d.scheduledFor,
    action: d.action as AlarmActionId | undefined,
  };
}

export function getDefaultAlarmSettings() {
  return {
    alarmToleranceMinutes: DEFAULT_ALARM_TOLERANCE_MINUTES,
    alarmSnoozeMinutes: DEFAULT_ALARM_SNOOZE_MINUTES,
  };
}

/** @deprecated use syncMedicationAlarmNotifications */
export async function syncMedicationNotifications(
  medication: Medication,
  previous?: Pick<Medication, 'doseNotificationId' | 'lowStockNotificationId'>,
): Promise<Medication> {
  return syncMedicationAlarmNotifications(medication, [], previous);
}
