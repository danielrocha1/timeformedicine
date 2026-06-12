import {
  ALARM_FOLLOWUP_DELAY_MINUTES,
  DEFAULT_ALARM_SNOOZE_MINUTES,
  DEFAULT_ALARM_TOLERANCE_MINUTES,
  DOSE_PROJECTION_DAYS,
} from '@/constants/theme';
import { generateId } from '@/lib/medication-utils';
import { getUpcomingScheduleSlots } from '@/lib/schedule-engine';
import type { DoseOccurrence, DoseOccurrenceStatus, Medication, ScheduleRecalcMode } from '@/types';

export function getAlarmToleranceMs(medication: Medication): number {
  return (medication.alarmToleranceMinutes ?? DEFAULT_ALARM_TOLERANCE_MINUTES) * 60 * 1000;
}

export function getAlarmSnoozeMs(medication: Medication): number {
  return (medication.alarmSnoozeMinutes ?? DEFAULT_ALARM_SNOOZE_MINUTES) * 60 * 1000;
}

function isSameSlot(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;
}

export function projectDoseOccurrences(
  medication: Medication,
  existing: DoseOccurrence[] = [],
  from: Date = new Date(),
  days: number = DOSE_PROJECTION_DAYS,
): DoseOccurrence[] {
  const medExisting = existing.filter((o) => o.medicationId === medication.id);
  const finalized = medExisting.filter((o) => o.status !== 'pending');
  const endTime = from.getTime() + days * 24 * 60 * 60 * 1000;

  const maxSlots = Math.max(64, Math.ceil((days * 24) / Math.max(1, medication.intervalHours)) + 8);
  const projectedSlots = getUpcomingScheduleSlots(medication, from, maxSlots).filter(
    (slot) => slot.getTime() <= endTime,
  );

  const pending: DoseOccurrence[] = [];
  for (const slot of projectedSlots) {
    const scheduledFor = slot.toISOString();
    const slotTaken = medExisting.some((o) => isSameSlot(o.scheduledFor, scheduledFor));
    if (!slotTaken) {
      pending.push({
        id: generateId(),
        medicationId: medication.id,
        scheduledFor,
        status: 'pending',
        snoozeCount: 0,
      });
    }
  }

  const preservedPending = medExisting.filter(
    (o) => o.status === 'pending' && new Date(o.scheduledFor).getTime() >= from.getTime() - 60_000,
  );

  const mergedPending = [...preservedPending];
  for (const occ of pending) {
    if (!mergedPending.some((o) => isSameSlot(o.scheduledFor, occ.scheduledFor))) {
      mergedPending.push(occ);
    }
  }

  return [...finalized, ...mergedPending].sort(
    (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  );
}

export function reconcileMissedOccurrences(
  occurrences: DoseOccurrence[],
  medications: Medication[],
  now: Date = new Date(),
): DoseOccurrence[] {
  return occurrences.map((occ) => {
    if (occ.status !== 'pending') return occ;
    const med = medications.find((m) => m.id === occ.medicationId);
    if (!med) return occ;
    const tolerance = getAlarmToleranceMs(med);
    if (now.getTime() > new Date(occ.scheduledFor).getTime() + tolerance) {
      return { ...occ, status: 'missed', missedAt: now.toISOString() };
    }
    return occ;
  });
}

export function getOccurrencesForMedication(
  occurrences: DoseOccurrence[],
  medicationId: string,
): DoseOccurrence[] {
  return occurrences
    .filter((o) => o.medicationId === medicationId)
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
}

export function getNextPendingOccurrence(
  occurrences: DoseOccurrence[],
  medicationId: string,
): DoseOccurrence | undefined {
  return getOccurrencesForMedication(occurrences, medicationId).find((o) => o.status === 'pending');
}

export function getNextActionableOccurrence(
  occurrences: DoseOccurrence[],
  medicationId: string,
  now: Date = new Date(),
  medication?: Medication,
): DoseOccurrence | undefined {
  const medOcc = getOccurrencesForMedication(occurrences, medicationId);
  const missed = medOcc.find((o) => o.status === 'missed');
  if (missed) return missed;

  const tolerance = medication ? getAlarmToleranceMs(medication) : DEFAULT_ALARM_TOLERANCE_MINUTES * 60_000;
  return medOcc.find(
    (o) =>
      o.status === 'pending' &&
      new Date(o.scheduledFor).getTime() >= now.getTime() - tolerance,
  );
}

export function refreshMedicationOccurrences(
  medication: Medication,
  allOccurrences: DoseOccurrence[],
  now: Date = new Date(),
): DoseOccurrence[] {
  const others = allOccurrences.filter((o) => o.medicationId !== medication.id);
  const preserved = allOccurrences.filter(
    (o) => o.medicationId === medication.id && o.status !== 'pending',
  );
  const projected = projectDoseOccurrences(medication, preserved, now);
  return [...others, ...projected].sort(
    (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  );
}

export function bootstrapOccurrences(
  medications: Medication[],
  existing: DoseOccurrence[],
  now: Date = new Date(),
): DoseOccurrence[] {
  let result = [...existing];
  for (const med of medications) {
    if (med.stockTotal <= 0) continue;
    const hasAny = result.some((o) => o.medicationId === med.id);
    if (!hasAny) {
      result = result.concat(projectDoseOccurrences(med, [], now));
    }
  }
  return reconcileMissedOccurrences(result, medications, now);
}

export function updateOccurrenceStatus(
  occurrences: DoseOccurrence[],
  occurrenceId: string,
  status: DoseOccurrenceStatus,
  extra?: Partial<DoseOccurrence>,
): DoseOccurrence[] {
  return occurrences.map((o) =>
    o.id === occurrenceId ? { ...o, status, ...extra } : o,
  );
}

export function snoozeOccurrence(
  occurrences: DoseOccurrence[],
  occurrenceId: string,
  snoozeMs: number,
  now: Date = new Date(),
): DoseOccurrence[] {
  return occurrences.map((o) =>
    o.id === occurrenceId && o.status === 'pending'
      ? {
          ...o,
          scheduledFor: new Date(now.getTime() + snoozeMs).toISOString(),
          status: 'pending' as const,
          snoozeCount: o.snoozeCount + 1,
        }
      : o,
  );
}

export function getDoseStatusLabel(status: DoseOccurrenceStatus): string {
  switch (status) {
    case 'taken':
      return 'Tomada';
    case 'missed':
      return 'Esquecida';
    case 'snoozed':
      return 'Adiada';
    default:
      return 'Pendente';
  }
}

export function getSchedulableOccurrences(
  occurrences: DoseOccurrence[],
  medicationId: string,
  horizonMs: number,
  now: Date = new Date(),
): DoseOccurrence[] {
  const end = now.getTime() + horizonMs;
  return getOccurrencesForMedication(occurrences, medicationId).filter(
    (o) =>
      o.status === 'pending' &&
      new Date(o.scheduledFor).getTime() > now.getTime() - 60_000 &&
      new Date(o.scheduledFor).getTime() <= end,
  );
}

export function applyScheduleRecalculation(
  medication: Medication,
  allOccurrences: DoseOccurrence[],
  mode: ScheduleRecalcMode,
  now: Date = new Date(),
): DoseOccurrence[] {
  if (mode === 'recalculate') {
    return refreshMedicationOccurrences(medication, allOccurrences, now);
  }

  const others = allOccurrences.filter((o) => o.medicationId !== medication.id);
  const medOcc = allOccurrences.filter((o) => o.medicationId === medication.id);
  const finalized = medOcc.filter((o) => o.status !== 'pending');
  const pending = medOcc.filter((o) => o.status === 'pending');
  const projected = projectDoseOccurrences(medication, [...finalized, ...pending], now);

  const merged = [...finalized, ...pending];
  for (const occ of projected) {
    if (occ.status !== 'pending') continue;
    const exists = merged.some((o) => isSameSlot(o.scheduledFor, occ.scheduledFor));
    if (!exists && new Date(occ.scheduledFor).getTime() > now.getTime()) {
      merged.push(occ);
    }
  }

  return [...others, ...merged].sort(
    (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  );
}
