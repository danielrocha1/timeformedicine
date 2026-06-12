import type { FrequencyMode, FrequencyPreset, Medication } from '@/types';

const MINUTES_PER_DAY = 24 * 60;

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function sortTimeStrings(times: string[]): string[] {
  return [...times].sort((a, b) => timeStringToMinutes(a) - timeStringToMinutes(b));
}

export function inferFrequencyPreset(intervalHours: number): FrequencyPreset {
  if (intervalHours === 8) return '8';
  if (intervalHours === 12) return '12';
  if (intervalHours === 24) return '24';
  return 'custom';
}

/** Gera horários do dia a partir de intervalo + horário inicial (ex.: 08:00 + 8h → 08:00, 16:00, 00:00) */
export function generateDailyTimesFromInterval(
  anchorTime: string,
  intervalHours: number,
): string[] {
  if (intervalHours <= 0 || intervalHours > 24) return [anchorTime];

  const intervalMin = intervalHours * 60;
  const startMin = timeStringToMinutes(anchorTime);
  const times: string[] = [];
  let current = startMin;
  const seen = new Set<number>();

  while (!seen.has(current)) {
    seen.add(current);
    times.push(minutesToTimeString(current));
    current = (current + intervalMin) % MINUTES_PER_DAY;
  }

  return times;
}

export type ScheduleInput = Pick<
  Medication,
  'frequencyMode' | 'intervalHours' | 'firstDoseTime' | 'customTimes'
>;

/** Horários diários efetivos do medicamento */
export function getDailyScheduleTimes(medication: ScheduleInput): string[] {
  if (medication.frequencyMode === 'fixed_times' && medication.customTimes?.length) {
    return sortTimeStrings(medication.customTimes);
  }
  return generateDailyTimesFromInterval(medication.firstDoseTime, medication.intervalHours);
}

function setTimeOnDate(base: Date, time: string): Date {
  const result = new Date(base);
  const minutes = timeStringToMinutes(time);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Próximo horário de dose a partir de `from` */
export function getNextScheduledDose(medication: ScheduleInput, from: Date = new Date()): Date {
  const slots = getDailyScheduleTimes(medication);
  if (slots.length === 0) {
    return new Date(from.getTime() + medication.intervalHours * 60 * 60 * 1000);
  }

  const candidates: Date[] = [];
  const dayStart = startOfDay(from);

  for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
    const day = addDays(dayStart, dayOffset);
    for (const slot of slots) {
      const candidate = setTimeOnDate(day, slot);
      if (candidate.getTime() > from.getTime()) {
        candidates.push(candidate);
      }
    }
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] ?? new Date(from.getTime() + medication.intervalHours * 60 * 60 * 1000);
}

/** Próxima dose após registrar uma tomada */
export function getNextScheduledDoseAfterTaken(
  medication: ScheduleInput,
  takenAt: Date = new Date(),
): Date {
  return getNextScheduledDose(medication, takenAt);
}

/** Lista os próximos N horários de dose a partir de uma data */
export function getUpcomingScheduleSlots(
  medication: ScheduleInput,
  from: Date,
  count: number,
): Date[] {
  const slots = getDailyScheduleTimes(medication);
  if (slots.length === 0 || count <= 0) return [];

  const result: Date[] = [];
  let cursor = new Date(from.getTime() - 1);
  const dayStart = startOfDay(from);

  for (let dayOffset = 0; result.length < count && dayOffset < 365; dayOffset++) {
    const day = addDays(dayStart, dayOffset);
    for (const slot of slots) {
      const candidate = setTimeOnDate(day, slot);
      if (candidate.getTime() > cursor.getTime()) {
        result.push(candidate);
        if (result.length >= count) break;
      }
    }
  }

  return result;
}

/** Calcula término do tratamento percorrendo slots reais */
export function calculateExpectedEndDateFromSchedule(
  startDate: string,
  stockTotal: number,
  pillsPerDose: number,
  medication: ScheduleInput,
): Date | null {
  const totalDoses = Math.floor(stockTotal / pillsPerDose);
  if (totalDoses <= 0 || pillsPerDose <= 0) return null;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const slots = getUpcomingScheduleSlots(medication, start, totalDoses);
  return slots[totalDoses - 1] ?? null;
}

export function getAverageIntervalHours(medication: ScheduleInput): number {
  const slots = getDailyScheduleTimes(medication);
  if (medication.frequencyMode === 'interval') return medication.intervalHours;
  if (slots.length <= 1) return 24;
  return 24 / slots.length;
}

export function formatDailySchedule(times: string[]): string {
  return times.join(' · ');
}

export function getFrequencyDescription(medication: ScheduleInput & { pillsPerDose?: number }): string {
  const times = getDailyScheduleTimes(medication);
  const timesLabel = formatDailySchedule(times);

  if (medication.frequencyMode === 'fixed_times') {
    return `Horários: ${timesLabel}`;
  }

  if (medication.intervalHours === 24) {
    return `1x ao dia às ${times[0] ?? medication.firstDoseTime}`;
  }

  return `A cada ${medication.intervalHours} horas (${timesLabel})`;
}

export function validateCustomTimes(times: string[]): string | null {
  if (times.length === 0) return 'Adicione pelo menos um horário';
  const unique = new Set(times);
  if (unique.size !== times.length) return 'Horários duplicados';
  return null;
}

export function resolveScheduleFromForm(input: {
  frequencyMode: FrequencyMode;
  frequencyPreset: FrequencyPreset;
  intervalHours: number;
  firstDoseTime: string;
  customTimes?: string[];
}): ScheduleInput {
  if (input.frequencyMode === 'fixed_times') {
    return {
      frequencyMode: 'fixed_times',
      intervalHours: input.intervalHours,
      firstDoseTime: input.firstDoseTime,
      customTimes: sortTimeStrings(input.customTimes ?? []),
    };
  }

  return {
    frequencyMode: 'interval',
    intervalHours: input.intervalHours,
    firstDoseTime: input.firstDoseTime,
    customTimes: undefined,
  };
}
