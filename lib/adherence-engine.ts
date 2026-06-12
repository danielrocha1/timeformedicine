import { ON_TIME_GRACE_MINUTES } from '@/constants/theme';
import { toDateOnlyIso } from '@/lib/medication-utils';
import type {
  DoseHistoryEntry,
  DoseHistoryStatus,
  DoseOccurrence,
  ForgotTimeRange,
  Medication,
} from '@/types';

export type CalendarDayStatus = 'all_on_time' | 'has_late' | 'has_missed' | 'pending' | 'empty';

export interface TreatmentCalendarDay {
  date: string;
  dayNumber: number;
  monthLabel: string;
  weekdayLabel: string;
  status: CalendarDayStatus;
  summary: string;
  doses: DoseHistoryEntry[];
}

export interface MedicationAdherenceBreakdown {
  medicationId: string;
  medicationName: string;
  expectedDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherencePercent: number;
}

export interface AdherenceReport {
  treatmentDays: number;
  expectedDoses: number;
  takenDoses: number;
  onTimeDoses: number;
  lateDoses: number;
  missedDoses: number;
  pendingDoses: number;
  cancelledDoses: number;
  adherencePercent: number;
  breakdown: MedicationAdherenceBreakdown[];
}

export const DOSE_STATUS_LABELS: Record<DoseHistoryStatus, string> = {
  on_time: 'Tomado no horário',
  late: 'Tomado atrasado',
  missed: 'Esquecido',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};

export function computeDelayMinutes(scheduledFor: Date, takenAt: Date): number {
  return Math.round((takenAt.getTime() - scheduledFor.getTime()) / 60_000);
}

export function computeTakenStatus(
  scheduledFor: Date,
  takenAt: Date,
  graceMinutes: number = ON_TIME_GRACE_MINUTES,
): 'on_time' | 'late' {
  const delay = computeDelayMinutes(scheduledFor, takenAt);
  return delay <= graceMinutes ? 'on_time' : 'late';
}

export function formatDelayLabel(delayMinutes: number | null | undefined): string {
  if (delayMinutes == null) return '—';
  if (delayMinutes <= 0) return 'No horário';
  if (delayMinutes < 60) return `${delayMinutes} min de atraso`;
  const hours = Math.floor(delayMinutes / 60);
  const mins = delayMinutes % 60;
  return mins > 0 ? `${hours}h${String(mins).padStart(2, '0')} de atraso` : `${hours}h de atraso`;
}

function occurrenceToHistoryEntry(
  occurrence: DoseOccurrence,
  medication: Medication,
  stored?: DoseHistoryEntry,
): DoseHistoryEntry {
  const scheduledFor = occurrence.scheduledFor;
  const base = {
    id: stored?.id ?? occurrence.id,
    occurrenceId: occurrence.id,
    medicationId: medication.id,
    medicationName: medication.name,
    dosage: medication.dosage,
    scheduledFor,
    recordedAt: stored?.recordedAt ?? scheduledFor,
    notes: stored?.notes,
    forgotTimeRange: stored?.forgotTimeRange,
    confirmedAt: stored?.confirmedAt,
  };

  if (occurrence.status === 'taken' && occurrence.takenAt) {
    const takenAt = occurrence.takenAt;
    const status = computeTakenStatus(new Date(scheduledFor), new Date(takenAt));
    return {
      ...base,
      status,
      takenAt,
      delayMinutes: computeDelayMinutes(new Date(scheduledFor), new Date(takenAt)),
      pillsConsumed: medication.pillsPerDose,
      recordedAt: takenAt,
      notes: stored?.notes,
    };
  }

  if (occurrence.status === 'missed') {
    return {
      ...base,
      status: 'missed',
      takenAt: undefined,
      delayMinutes: null,
      recordedAt: occurrence.missedAt ?? scheduledFor,
      notes: stored?.notes,
      forgotTimeRange: stored?.forgotTimeRange,
      confirmedAt: stored?.confirmedAt ?? occurrence.missedAt,
    };
  }

  return {
    ...base,
    status: 'pending',
    takenAt: undefined,
    delayMinutes: null,
    notes: stored?.notes,
  };
}

export function buildUnifiedHistory(
  medications: Medication[],
  occurrences: DoseOccurrence[],
  storedHistory: DoseHistoryEntry[],
): DoseHistoryEntry[] {
  const medMap = new Map(medications.map((m) => [m.id, m]));
  const storedByOccurrence = new Map(
    storedHistory.filter((h) => h.occurrenceId).map((h) => [h.occurrenceId!, h]),
  );
  const usedOccurrenceIds = new Set<string>();

  const fromOccurrences: DoseHistoryEntry[] = [];
  for (const occ of occurrences) {
    const med = medMap.get(occ.medicationId);
    if (!med) continue;
    usedOccurrenceIds.add(occ.id);
    fromOccurrences.push(
      occurrenceToHistoryEntry(occ, med, storedByOccurrence.get(occ.id)),
    );
  }

  const legacyEntries = storedHistory
    .filter((h) => !h.occurrenceId || !usedOccurrenceIds.has(h.occurrenceId))
    .map((h) => migrateLegacyEntry(h));

  return [...fromOccurrences, ...legacyEntries].sort(
    (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime(),
  );
}

function migrateLegacyEntry(entry: DoseHistoryEntry): DoseHistoryEntry {
  if (entry.status && entry.scheduledFor) return entry;

  const takenAt = entry.takenAt ?? entry.recordedAt;
  const scheduledFor = entry.scheduledFor ?? takenAt;
  const status: DoseHistoryStatus = entry.status ?? 'on_time';

  return {
    ...entry,
    status,
    scheduledFor,
    takenAt: entry.takenAt ?? takenAt,
    delayMinutes: entry.delayMinutes ?? 0,
    recordedAt: entry.recordedAt ?? takenAt,
  };
}

export function createTakenHistoryEntry(
  medication: Medication,
  occurrence: DoseOccurrence,
  takenAt: Date,
  notes?: string,
): DoseHistoryEntry {
  const scheduled = new Date(occurrence.scheduledFor);
  const status = computeTakenStatus(scheduled, takenAt);
  return {
    id: generateHistoryId(),
    occurrenceId: occurrence.id,
    medicationId: medication.id,
    medicationName: medication.name,
    dosage: medication.dosage,
    status,
    scheduledFor: occurrence.scheduledFor,
    takenAt: takenAt.toISOString(),
    delayMinutes: computeDelayMinutes(scheduled, takenAt),
    pillsConsumed: medication.pillsPerDose,
    notes,
    confirmedAt: takenAt.toISOString(),
    recordedAt: takenAt.toISOString(),
  };
}

export function createMissedHistoryEntry(
  medication: Medication,
  occurrence: DoseOccurrence,
  missedAt: Date,
  options?: { notes?: string; forgotTimeRange?: ForgotTimeRange },
): DoseHistoryEntry {
  return {
    id: generateHistoryId(),
    occurrenceId: occurrence.id,
    medicationId: medication.id,
    medicationName: medication.name,
    dosage: medication.dosage,
    status: 'missed',
    scheduledFor: occurrence.scheduledFor,
    delayMinutes: null,
    notes: options?.notes,
    forgotTimeRange: options?.forgotTimeRange,
    confirmedAt: missedAt.toISOString(),
    recordedAt: missedAt.toISOString(),
  };
}

export function createCancelledHistoryEntry(
  medication: Medication,
  occurrence: DoseOccurrence,
  cancelledAt: Date,
): DoseHistoryEntry {
  return {
    id: generateHistoryId(),
    occurrenceId: occurrence.id,
    medicationId: medication.id,
    medicationName: medication.name,
    dosage: medication.dosage,
    status: 'cancelled',
    scheduledFor: occurrence.scheduledFor,
    delayMinutes: null,
    recordedAt: cancelledAt.toISOString(),
  };
}

function generateHistoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getTreatmentStartDate(medications: Medication[]): Date {
  if (medications.length === 0) return new Date();
  const starts = medications.map((m) => new Date(m.startDate).getTime());
  const earliest = Math.min(...starts);
  const d = new Date(earliest);
  d.setHours(0, 0, 0, 0);
  return d;
}

function countTreatmentDays(medications: Medication[], now: Date = new Date()): number {
  const start = getTreatmentStartDate(medications);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)) + 1);
}

function isDueDose(entry: DoseHistoryEntry, now: Date): boolean {
  return new Date(entry.scheduledFor).getTime() <= now.getTime();
}

export function buildAdherenceReport(
  medications: Medication[],
  occurrences: DoseOccurrence[],
  storedHistory: DoseHistoryEntry[],
  now: Date = new Date(),
): AdherenceReport {
  const unified = buildUnifiedHistory(medications, occurrences, storedHistory);
  const activeMeds = medications.filter((m) => m.stockTotal >= 0);

  const dueEntries = unified.filter((e) => isDueDose(e, now));
  const onTimeDoses = dueEntries.filter((e) => e.status === 'on_time').length;
  const lateDoses = dueEntries.filter((e) => e.status === 'late').length;
  const missedDoses = dueEntries.filter((e) => e.status === 'missed').length;
  const pendingDoses = unified.filter((e) => e.status === 'pending').length;
  const cancelledDoses = dueEntries.filter((e) => e.status === 'cancelled').length;
  const takenDoses = onTimeDoses + lateDoses;
  const expectedDoses = takenDoses + missedDoses + cancelledDoses;

  const adherencePercent =
    expectedDoses > 0 ? Math.round((takenDoses / expectedDoses) * 100) : 100;

  const breakdown: MedicationAdherenceBreakdown[] = activeMeds.map((med) => {
    const medEntries = dueEntries.filter((e) => e.medicationId === med.id);
    const taken = medEntries.filter((e) => e.status === 'on_time' || e.status === 'late').length;
    const missed = medEntries.filter((e) => e.status === 'missed').length;
    const expected = taken + missed + medEntries.filter((e) => e.status === 'cancelled').length;
    return {
      medicationId: med.id,
      medicationName: med.name,
      expectedDoses: expected,
      takenDoses: taken,
      missedDoses: missed,
      adherencePercent: expected > 0 ? Math.round((taken / expected) * 100) : 100,
    };
  });

  return {
    treatmentDays: countTreatmentDays(activeMeds, now),
    expectedDoses,
    takenDoses,
    onTimeDoses,
    lateDoses,
    missedDoses,
    pendingDoses,
    cancelledDoses,
    adherencePercent,
    breakdown: breakdown.filter((b) => b.expectedDoses > 0 || b.takenDoses > 0),
  };
}

function resolveCalendarDayStatus(doses: DoseHistoryEntry[]): CalendarDayStatus {
  if (doses.length === 0) return 'empty';
  if (doses.some((d) => d.status === 'missed')) return 'has_missed';
  if (doses.some((d) => d.status === 'late')) return 'has_late';
  if (doses.every((d) => d.status === 'on_time')) return 'all_on_time';
  if (doses.some((d) => d.status === 'pending')) return 'pending';
  return 'empty';
}

export function getCalendarDaySummary(status: CalendarDayStatus, doses: DoseHistoryEntry[]): string {
  switch (status) {
    case 'all_on_time':
      return 'Todas doses tomadas';
    case 'has_late': {
      const lateCount = doses.filter((d) => d.status === 'late').length;
      return lateCount === 1 ? 'Uma dose atrasada' : `${lateCount} doses atrasadas`;
    }
    case 'has_missed': {
      const missedCount = doses.filter((d) => d.status === 'missed').length;
      return missedCount === 1 ? 'Dose esquecida' : `${missedCount} doses esquecidas`;
    }
    case 'pending':
      return 'Doses pendentes';
    default:
      return 'Sem registros';
  }
}

export function getCalendarDayEmoji(status: CalendarDayStatus): string {
  switch (status) {
    case 'all_on_time':
      return '🟢';
    case 'has_late':
      return '🟡';
    case 'has_missed':
      return '🔴';
    case 'pending':
      return '⚪';
    default:
      return '⬜';
  }
}

export function buildTreatmentCalendar(
  medications: Medication[],
  occurrences: DoseOccurrence[],
  storedHistory: DoseHistoryEntry[],
  days: number = 30,
  now: Date = new Date(),
): TreatmentCalendarDay[] {
  const unified = buildUnifiedHistory(medications, occurrences, storedHistory);
  const result: TreatmentCalendarDay[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateKey = toDateOnlyIso(date);

    const dayDoses = unified.filter((e) => toDateOnlyIso(new Date(e.scheduledFor)) === dateKey);
    const status = resolveCalendarDayStatus(dayDoses);

    result.push({
      date: dateKey,
      dayNumber: date.getDate(),
      monthLabel: date.toLocaleDateString('pt-BR', { month: 'short' }),
      weekdayLabel: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      status,
      summary: getCalendarDaySummary(status, dayDoses),
      doses: dayDoses.sort(
        (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
      ),
    });
  }

  return result;
}

export function getStatusColorKey(
  status: DoseHistoryStatus,
): 'success' | 'warning' | 'danger' | 'primary' | 'textSecondary' {
  switch (status) {
    case 'on_time':
      return 'success';
    case 'late':
      return 'warning';
    case 'missed':
      return 'danger';
    case 'pending':
      return 'primary';
    default:
      return 'textSecondary';
  }
}
