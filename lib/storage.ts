import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_ALARM_SNOOZE_MINUTES, DEFAULT_ALARM_TOLERANCE_MINUTES } from '@/constants/theme';
import { calculateExpectedEndDateFromSchedule, inferFrequencyPreset } from '@/lib/schedule-engine';
import { toDateOnlyIso } from '@/lib/medication-utils';
import type { DoseHistoryEntry, DoseOccurrence, FrequencyMode, FrequencyPreset, Medication, MedicationType } from '@/types';

const KEYS = {
  medications: '@timeformedicine/medications',
  doseHistory: '@timeformedicine/dose-history',
  doseOccurrences: '@timeformedicine/dose-occurrences',
  acknowledgedTreatments: '@timeformedicine/acknowledged-treatments',
  deviceTimezoneOffset: '@timeformedicine/device-timezone-offset',
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function migrateMedication(raw: Medication): Medication {
  const medicationType: MedicationType = raw.medicationType ?? 'tablet';
  const startDate =
    raw.startDate ?? (raw.createdAt ? toDateOnlyIso(new Date(raw.createdAt)) : toDateOnlyIso(new Date()));

  const frequencyMode: FrequencyMode = raw.frequencyMode ?? 'interval';
  const frequencyPreset: FrequencyPreset =
    raw.frequencyPreset ?? inferFrequencyPreset(raw.intervalHours ?? 8);

  const schedule = {
    frequencyMode,
    intervalHours: raw.intervalHours ?? 8,
    firstDoseTime: raw.firstDoseTime ?? '08:00',
    customTimes: raw.customTimes,
  };

  const expectedEndDate =
    raw.expectedEndDate ??
    calculateExpectedEndDateFromSchedule(
      startDate,
      raw.stockTotal,
      raw.pillsPerDose,
      schedule,
    )?.toISOString() ??
    null;

  return {
    ...raw,
    medicationType,
    frequencyMode,
    frequencyPreset,
    startDate,
    expectedEndDate,
    intervalHours: raw.intervalHours ?? 8,
    firstDoseTime: raw.firstDoseTime ?? '08:00',
    alarmToleranceMinutes: raw.alarmToleranceMinutes ?? DEFAULT_ALARM_TOLERANCE_MINUTES,
    alarmSnoozeMinutes: raw.alarmSnoozeMinutes ?? DEFAULT_ALARM_SNOOZE_MINUTES,
    treatmentStatus:
      raw.treatmentStatus ??
      (raw.treatmentCompletedAt ? 'completed' : 'active'),
    pausedAt: raw.pausedAt ?? null,
  };
}

export async function getMedications(): Promise<Medication[]> {
  const meds = await readJson<Medication[]>(KEYS.medications, []);
  return meds.map(migrateMedication);
}

export async function saveMedications(medications: Medication[]): Promise<void> {
  await writeJson(KEYS.medications, medications);
}

function migrateHistoryEntry(raw: DoseHistoryEntry): DoseHistoryEntry {
  const takenAt = raw.takenAt ?? (raw as { takenAt?: string }).takenAt;
  const recordedAt = raw.recordedAt ?? takenAt ?? new Date().toISOString();
  const scheduledFor = raw.scheduledFor ?? takenAt ?? recordedAt;

  return {
    ...raw,
    status: raw.status ?? (takenAt ? 'on_time' : 'pending'),
    scheduledFor,
    takenAt,
    delayMinutes: raw.delayMinutes ?? (takenAt ? 0 : null),
    recordedAt,
  };
}

export async function getDoseHistory(): Promise<DoseHistoryEntry[]> {
  const history = await readJson<DoseHistoryEntry[]>(KEYS.doseHistory, []);
  return history.map(migrateHistoryEntry).sort(
    (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime(),
  );
}

export async function addDoseRecord(record: DoseHistoryEntry): Promise<DoseHistoryEntry[]> {
  const history = await getDoseHistory();
  const withoutDuplicate = record.occurrenceId
    ? history.filter((h) => h.occurrenceId !== record.occurrenceId)
    : history;
  const updated = [record, ...withoutDuplicate];
  await writeJson(KEYS.doseHistory, updated);
  return updated;
}

export async function upsertDoseHistoryEntry(record: DoseHistoryEntry): Promise<DoseHistoryEntry[]> {
  return addDoseRecord(record);
}

export async function updateDoseHistoryNotes(
  entryId: string,
  notes: string,
): Promise<DoseHistoryEntry[]> {
  const history = await getDoseHistory();
  const updated = history.map((h) => (h.id === entryId ? { ...h, notes } : h));
  await writeJson(KEYS.doseHistory, updated);
  return updated;
}

export async function removeDoseHistoryForMedication(medicationId: string): Promise<void> {
  const history = await getDoseHistory();
  await writeJson(
    KEYS.doseHistory,
    history.filter((r) => r.medicationId !== medicationId),
  );
}

export async function getDoseOccurrences(): Promise<DoseOccurrence[]> {
  return readJson<DoseOccurrence[]>(KEYS.doseOccurrences, []);
}

export async function saveDoseOccurrences(occurrences: DoseOccurrence[]): Promise<void> {
  await writeJson(KEYS.doseOccurrences, occurrences);
}

export async function removeOccurrencesForMedication(medicationId: string): Promise<void> {
  const occurrences = await getDoseOccurrences();
  await saveDoseOccurrences(occurrences.filter((o) => o.medicationId !== medicationId));
}

export async function getAcknowledgedTreatmentIds(): Promise<string[]> {
  return readJson<string[]>(KEYS.acknowledgedTreatments, []);
}

export async function acknowledgeTreatment(medicationId: string): Promise<void> {
  const ids = await getAcknowledgedTreatmentIds();
  if (!ids.includes(medicationId)) {
    await writeJson(KEYS.acknowledgedTreatments, [...ids, medicationId]);
  }
}

export async function getStoredTimezoneOffset(): Promise<number | null> {
  const value = await AsyncStorage.getItem(KEYS.deviceTimezoneOffset);
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function saveTimezoneOffset(offset: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.deviceTimezoneOffset, String(offset));
}
