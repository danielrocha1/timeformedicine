import { LOW_STOCK_DOSE_THRESHOLD } from '@/constants/theme';
import {
  calculateExpectedEndDateFromSchedule,
  getAverageIntervalHours,
  getDailyScheduleTimes,
  getFrequencyDescription,
  getNextScheduledDose,
  getNextScheduledDoseAfterTaken,
  getUpcomingScheduleSlots,
  inferFrequencyPreset,
} from '@/lib/schedule-engine';
import type { DoseOccurrence, Medication, MedicationFormData, MedicationType, UpcomingDose } from '@/types';
import { MEDICATION_TYPE_OPTIONS } from '@/types';

export {
  formatDailySchedule,
  generateDailyTimesFromInterval,
  getDailyScheduleTimes,
  getFrequencyDescription,
} from '@/lib/schedule-engine';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function parseDateInput(isoOrDate: string): Date {
  const d = new Date(isoOrDate);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateOnlyIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMedicationTypeLabel(type: MedicationType): string {
  return MEDICATION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Outros';
}

export function getAmountUnitLabel(type: MedicationType, amount = 1): string {
  const unit = MEDICATION_TYPE_OPTIONS.find((o) => o.value === type)?.unit ?? 'unidade(s)';
  if (type === 'syrup') return 'ml';
  if (amount === 1 && unit.endsWith('(s)')) {
    return unit.replace('(s)', '');
  }
  return unit;
}

export function formatAmountPerDose(amount: number, type: MedicationType): string {
  const unit = getAmountUnitLabel(type, amount);
  if (type === 'syrup') return `${amount} ml por dose`;
  return `${amount} ${unit} por dose`;
}

/** @deprecated use getNextScheduledDose */
export function calculateNextDose(from: Date, intervalHours: number, firstDoseTime?: string): Date {
  return getNextScheduledDose(
    {
      frequencyMode: 'interval',
      intervalHours,
      firstDoseTime: firstDoseTime ?? '08:00',
    },
    from,
  );
}

export function calculateNextDoseForMedication(medication: Medication, from: Date = new Date()): Date {
  return getNextScheduledDose(medication, from);
}

export function calculateNextDoseAfterTaken(medication: Medication, takenAt: Date = new Date()): Date {
  return getNextScheduledDoseAfterTaken(medication, takenAt);
}

export function getRemainingDoses(medication: Medication): number {
  if (medication.pillsPerDose <= 0) return 0;
  return Math.floor(medication.stockTotal / medication.pillsPerDose);
}

export function isLowStock(medication: Medication): boolean {
  return getRemainingDoses(medication) < LOW_STOCK_DOSE_THRESHOLD && medication.stockTotal > 0;
}

export function calculateExpectedEndDate(
  startDate: string,
  stockTotal: number,
  pillsPerDose: number,
  schedule: Pick<Medication, 'frequencyMode' | 'intervalHours' | 'firstDoseTime' | 'customTimes'>,
): Date | null {
  return calculateExpectedEndDateFromSchedule(startDate, stockTotal, pillsPerDose, schedule);
}

export function buildMedicationFromForm(
  data: MedicationFormData,
  existing?: Medication,
): Omit<Medication, 'id' | 'nextDoseAt' | 'doseNotificationId' | 'lowStockNotificationId'> {
  const now = new Date();
  const schedule = {
    frequencyMode: data.frequencyMode,
    intervalHours: data.intervalHours,
    firstDoseTime: data.firstDoseTime,
    customTimes: data.customTimes,
  };

  const expectedEnd = calculateExpectedEndDateFromSchedule(
    data.startDate,
    data.stockTotal,
    data.pillsPerDose,
    schedule,
  );

  return {
    name: data.name,
    dosage: data.dosage,
    medicationType: data.medicationType,
    frequencyMode: data.frequencyMode,
    frequencyPreset: data.frequencyPreset,
    intervalHours: data.intervalHours,
    firstDoseTime: data.firstDoseTime,
    customTimes: data.customTimes,
    stockTotal: data.stockTotal,
    initialStock: existing?.initialStock ?? data.stockTotal,
    pillsPerDose: data.pillsPerDose,
    startDate: data.startDate,
    expectedEndDate: expectedEnd?.toISOString() ?? null,
    notes: data.notes,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function recalculateExpectedEndDate(medication: Medication): Medication {
  const expectedEnd = calculateExpectedEndDateFromSchedule(
    medication.startDate,
    medication.stockTotal,
    medication.pillsPerDose,
    medication,
  );
  return {
    ...medication,
    expectedEndDate: expectedEnd?.toISOString() ?? null,
  };
}

export function calculateStockRunsOutAt(medication: Medication): Date | null {
  const remainingDoses = getRemainingDoses(medication);
  if (remainingDoses <= 0) return null;

  const slots = getUpcomingScheduleSlots(medication, new Date(), remainingDoses);
  return slots[remainingDoses - 1] ?? null;
}

export function buildUpcomingDoses(
  medications: Medication[],
  occurrences: DoseOccurrence[] = [],
): UpcomingDose[] {
  const now = new Date();
  const active = medications.filter(
    (m) => (m.treatmentStatus ?? 'active') === 'active' && m.stockTotal > 0,
  );

  const items = active.map((medication) => {
    const medOcc = occurrences
      .filter((o) => o.medicationId === medication.id)
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

    const missed = medOcc.filter((o) => o.status === 'missed');
    const nextPending = medOcc.find((o) => o.status === 'pending');
    const nextOccurrence = missed[0] ?? nextPending;
    const nextDoseAt = nextOccurrence
      ? new Date(nextOccurrence.scheduledFor)
      : new Date(medication.nextDoseAt);

    return {
      medication,
      nextDoseAt,
      isNext: false,
      remainingDoses: getRemainingDoses(medication),
      stockRunsOutAt: calculateStockRunsOutAt(medication),
      isLowStock: isLowStock(medication),
      hasMissedDoses: missed.length > 0,
      nextOccurrence,
    };
  });

  const sorted = [...items].sort((a, b) => a.nextDoseAt.getTime() - b.nextDoseAt.getTime());
  const nextId =
    sorted.find((u) => u.nextOccurrence?.status === 'pending' && u.nextDoseAt >= now)?.medication
      .id ??
    sorted.find((u) => u.hasMissedDoses)?.medication.id ??
    sorted[0]?.medication.id;

  return sorted.map((item) => ({ ...item, isNext: item.medication.id === nextId }));
}

export function getRelativeDoseLabel(date: Date): string {
  const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
  if (diffMin < -5) return 'Atrasado';
  if (diffMin <= 5) return 'Agora';
  if (diffMin < 60) return `Em ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Em ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
}

export function getTreatmentDurationDays(medication: Medication): number | null {
  if (!medication.expectedEndDate) return null;
  const start = parseDateInput(medication.startDate);
  const end = new Date(medication.expectedEndDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function inferMedicationPreset(medication: Medication) {
  return medication.frequencyPreset ?? inferFrequencyPreset(medication.intervalHours);
}

export function getScheduleSummary(medication: Medication): string {
  return getFrequencyDescription(medication);
}

export function getDosesPerDay(medication: Medication): number {
  return getDailyScheduleTimes(medication).length;
}

export function getAverageDoseIntervalLabel(medication: Medication): string {
  const avg = getAverageIntervalHours(medication);
  if (avg >= 24) return '1x ao dia';
  return `~${Math.round(avg)}h entre doses`;
}
