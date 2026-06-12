import { LOW_STOCK_DOSE_THRESHOLD } from '@/constants/theme';
import type { Medication, UpcomingDose } from '@/types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
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

export function calculateNextDose(from: Date, intervalHours: number, firstDoseTime?: string): Date {
  const next = new Date(from);

  if (firstDoseTime) {
    const minutes = timeStringToMinutes(firstDoseTime);
    next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (next <= from) {
      next.setTime(next.getTime() + intervalHours * 60 * 60 * 1000);
    }
    return next;
  }

  if (next <= from) {
    next.setTime(from.getTime() + intervalHours * 60 * 60 * 1000);
  }
  return next;
}

export function calculateNextDoseAfterTaken(intervalHours: number): Date {
  return new Date(Date.now() + intervalHours * 60 * 60 * 1000);
}

export function getRemainingDoses(medication: Medication): number {
  if (medication.pillsPerDose <= 0) return 0;
  return Math.floor(medication.stockTotal / medication.pillsPerDose);
}

export function isLowStock(medication: Medication): boolean {
  return getRemainingDoses(medication) < LOW_STOCK_DOSE_THRESHOLD && medication.stockTotal > 0;
}

export function calculateStockRunsOutAt(medication: Medication): Date | null {
  const remainingDoses = getRemainingDoses(medication);
  if (remainingDoses <= 0) return null;
  const nextDose = new Date(medication.nextDoseAt);
  const msUntilEmpty = (remainingDoses - 1) * medication.intervalHours * 60 * 60 * 1000;
  return new Date(nextDose.getTime() + msUntilEmpty);
}

export function buildUpcomingDoses(medications: Medication[]): UpcomingDose[] {
  const now = new Date();
  const active = medications.filter((m) => m.stockTotal > 0);
  const sorted = [...active].sort(
    (a, b) => new Date(a.nextDoseAt).getTime() - new Date(b.nextDoseAt).getTime(),
  );
  const nextId = sorted.find((m) => new Date(m.nextDoseAt) >= now)?.id ?? sorted[0]?.id;

  return sorted.map((medication) => ({
    medication,
    nextDoseAt: new Date(medication.nextDoseAt),
    isNext: medication.id === nextId,
    remainingDoses: getRemainingDoses(medication),
    stockRunsOutAt: calculateStockRunsOutAt(medication),
    isLowStock: isLowStock(medication),
  }));
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
