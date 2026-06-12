import { ON_TIME_GRACE_MINUTES } from '@/constants/theme';
import { buildUnifiedHistory, type AdherenceReport } from '@/lib/adherence-engine';
import { toDateOnlyIso } from '@/lib/medication-utils';
import type {
  DoseHistoryEntry,
  DoseOccurrence,
  ForgotTimeRange,
  GroupedDoseItem,
  GroupedDoseSlot,
  Medication,
  MedicationFormData,
  TreatmentCompletionSummary,
} from '@/types';
import { FORGOT_TIME_RANGE_OPTIONS } from '@/types';

export const FORGOT_TIME_RANGE_LABELS: Record<ForgotTimeRange, string> = Object.fromEntries(
  FORGOT_TIME_RANGE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ForgotTimeRange, string>;

export function getSlotKey(iso: string): string {
  const d = new Date(iso);
  d.setSeconds(0, 0);
  return String(d.getTime());
}

export function groupOccurrencesBySlot(
  medications: Medication[],
  occurrences: DoseOccurrence[],
  now: Date = new Date(),
  windowMs: number = 90 * 60 * 1000,
): GroupedDoseSlot[] {
  const medMap = new Map(medications.map((m) => [m.id, m]));
  const actionable = occurrences.filter((o) => {
    if (o.status !== 'pending' && o.status !== 'missed') return false;
    const scheduled = new Date(o.scheduledFor).getTime();
    return scheduled >= now.getTime() - windowMs && scheduled <= now.getTime() + 60 * 60 * 1000;
  });

  const groups = new Map<string, GroupedDoseItem[]>();
  for (const occ of actionable) {
    const med = medMap.get(occ.medicationId);
    if (!med || med.stockTotal < med.pillsPerDose) continue;
    const key = getSlotKey(occ.scheduledFor);
    const list = groups.get(key) ?? [];
    list.push({ medication: med, occurrence: occ });
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([slotKey, items]) => ({
      slotKey,
      scheduledFor: items[0].occurrence.scheduledFor,
      items: items.sort((a, b) => a.medication.name.localeCompare(b.medication.name)),
    }))
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
}

export function getCurrentGroupedSlots(
  medications: Medication[],
  occurrences: DoseOccurrence[],
  now: Date = new Date(),
): GroupedDoseSlot[] {
  return groupOccurrencesBySlot(medications, occurrences, now).filter((g) => {
    const scheduled = new Date(g.scheduledFor).getTime();
    return scheduled <= now.getTime() + 5 * 60 * 1000;
  });
}

export function hasScheduleConfigChange(
  existing: Medication,
  data: MedicationFormData,
): boolean {
  const timesEqual =
    JSON.stringify(existing.customTimes ?? []) === JSON.stringify(data.customTimes ?? []);
  return (
    existing.frequencyMode !== data.frequencyMode ||
    existing.frequencyPreset !== data.frequencyPreset ||
    existing.intervalHours !== data.intervalHours ||
    existing.firstDoseTime !== data.firstDoseTime ||
    !timesEqual
  );
}

export function buildForgotObservation(range: ForgotTimeRange, confirmedAt: Date): string {
  return `Usuário informou: "${FORGOT_TIME_RANGE_LABELS[range]}" — confirmado às ${confirmedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function buildMedicationTreatmentSummary(
  medication: Medication,
  history: DoseHistoryEntry[],
  now: Date = new Date(),
): TreatmentCompletionSummary {
  const medHistory = history.filter((h) => h.medicationId === medication.id);
  const due = medHistory.filter((h) => new Date(h.scheduledFor).getTime() <= now.getTime());
  const onTime = due.filter((h) => h.status === 'on_time').length;
  const late = due.filter((h) => h.status === 'late').length;
  const missed = due.filter((h) => h.status === 'missed').length;
  const taken = onTime + late;
  const expected = taken + missed;
  const start = new Date(medication.startDate);
  start.setHours(0, 0, 0, 0);
  const end = now;
  const durationDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );

  return {
    medicationId: medication.id,
    medicationName: medication.name,
    durationDays,
    expectedDoses: expected > 0 ? expected : medication.initialStock / Math.max(1, medication.pillsPerDose),
    takenDoses: taken,
    lateDoses: late,
    missedDoses: missed,
    adherencePercent: expected > 0 ? Math.round((taken / expected) * 100) : 100,
    completedAt: now.toISOString(),
  };
}

export function detectNewlyCompletedTreatments(
  medications: Medication[],
  occurrences: DoseOccurrence[],
  history: DoseHistoryEntry[],
  acknowledgedIds: string[],
  now: Date = new Date(),
): TreatmentCompletionSummary[] {
  const unified = buildUnifiedHistory(medications, occurrences, history);
  const results: TreatmentCompletionSummary[] = [];

  for (const med of medications) {
    if (med.treatmentCompletedAt && acknowledgedIds.includes(med.id)) continue;
    if (med.stockTotal > 0) continue;

    const pending = occurrences.some(
      (o) => o.medicationId === med.id && o.status === 'pending',
    );
    if (pending) continue;

    const hadTreatment = med.initialStock > 0;
    const hasHistory = unified.some((h) => h.medicationId === med.id && h.status !== 'pending');
    if (!hadTreatment && !hasHistory) continue;
    if (acknowledgedIds.includes(med.id) && med.treatmentCompletedAt) continue;

    results.push(buildMedicationTreatmentSummary(med, unified, now));
  }

  return results;
}

export function isMedicationTreatmentComplete(
  medication: Medication,
  occurrences: DoseOccurrence[],
): boolean {
  if (medication.stockTotal > 0) return false;
  return !occurrences.some(
    (o) => o.medicationId === medication.id && o.status === 'pending',
  );
}

export function formatDelayCompact(delayMinutes: number | null | undefined): string {
  if (delayMinutes == null || delayMinutes <= 0) return 'No horário';
  const hours = Math.floor(delayMinutes / 60);
  const mins = delayMinutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${String(mins).padStart(2, '0')}`;
}

export function getDeviceTimezoneOffset(): number {
  return -new Date().getTimezoneOffset();
}

export function formatHistoryDelayDisplay(entry: DoseHistoryEntry): string {
  if (entry.status === 'late' && entry.delayMinutes != null) {
    return formatDelayCompact(entry.delayMinutes);
  }
  if (entry.status === 'on_time') return 'No horário';
  return '—';
}

export function scheduleFieldsFromMedication(med: Medication): Pick<
  MedicationFormData,
  'frequencyMode' | 'frequencyPreset' | 'intervalHours' | 'firstDoseTime' | 'customTimes'
> {
  return {
    frequencyMode: med.frequencyMode,
    frequencyPreset: med.frequencyPreset,
    intervalHours: med.intervalHours,
    firstDoseTime: med.firstDoseTime,
    customTimes: med.customTimes,
  };
}

export function countExpectedDosesFromStock(medication: Medication): number {
  return Math.floor(medication.initialStock / Math.max(1, medication.pillsPerDose));
}

export { ON_TIME_GRACE_MINUTES };
