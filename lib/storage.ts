import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DoseRecord, Medication } from '@/types';

const KEYS = {
  medications: '@timeformedicine/medications',
  doseHistory: '@timeformedicine/dose-history',
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

export async function getMedications(): Promise<Medication[]> {
  return readJson<Medication[]>(KEYS.medications, []);
}

export async function saveMedications(medications: Medication[]): Promise<void> {
  await writeJson(KEYS.medications, medications);
}

export async function getDoseHistory(): Promise<DoseRecord[]> {
  const history = await readJson<DoseRecord[]>(KEYS.doseHistory, []);
  return history.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
}

export async function addDoseRecord(record: DoseRecord): Promise<DoseRecord[]> {
  const history = await getDoseHistory();
  const updated = [record, ...history];
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
