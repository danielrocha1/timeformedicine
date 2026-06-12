export type MedicationType = 'tablet' | 'capsule' | 'drops' | 'syrup' | 'other';

/** Preset de frequência ou personalizado */
export type FrequencyPreset = '8' | '12' | '24' | 'custom';

/** Intervalo regular ou horários fixos no dia */
export type FrequencyMode = 'interval' | 'fixed_times';

export type DoseOccurrenceStatus = 'pending' | 'taken' | 'snoozed' | 'missed';

export type TreatmentStatus = 'active' | 'paused' | 'completed';

export type ThemeMode = 'system' | 'light' | 'dark';

export type TimeFormat = '24h' | '12h';

export type AppLanguage = 'pt-BR';

export interface NotificationPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  alertTitle: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursSilentVibration: boolean;
}

export interface SecurityPreferences {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  autoLockMinutes: number;
}

export interface AccessibilityPreferences {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface UserProfile {
  fullName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  profile: UserProfile;
  themeMode: ThemeMode;
  language: AppLanguage;
  timeFormat: TimeFormat;
  notifications: NotificationPreferences;
  security: SecurityPreferences;
  accessibility: AccessibilityPreferences;
  onboardingCompleted: boolean;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  platform: string;
  lastActiveAt: string;
}

export type ScheduleRecalcMode = 'keep' | 'recalculate';

export type AlarmActionId =
  | 'TOMEI_AGORA'
  | 'LEMBRAR_DEPOIS'
  | 'ESQUECI'
  | 'TOMEI'
  | 'ESQUECI_FOLLOWUP'
  | 'TOMEI_TODOS'
  | 'REGISTRAR_INDIVIDUAL';

export interface DoseOccurrence {
  id: string;
  medicationId: string;
  scheduledFor: string;
  status: DoseOccurrenceStatus;
  takenAt?: string;
  snoozeCount: number;
  missedAt?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  medicationType: MedicationType;
  frequencyMode: FrequencyMode;
  frequencyPreset: FrequencyPreset;
  intervalHours: number;
  firstDoseTime: string;
  customTimes?: string[];
  stockTotal: number;
  initialStock: number;
  pillsPerDose: number;
  startDate: string;
  expectedEndDate: string | null;
  alarmToleranceMinutes?: number;
  alarmSnoozeMinutes?: number;
  notes?: string;
  nextDoseAt: string;
  doseNotificationId?: string;
  lowStockNotificationId?: string;
  treatmentCompletedAt?: string | null;
  treatmentStatus?: TreatmentStatus;
  pausedAt?: string | null;
  photoUri?: string | null;
  deviceTimezoneOffset?: number;
  createdAt: string;
  updatedAt: string;
}

export type DoseHistoryStatus = 'on_time' | 'late' | 'missed' | 'pending' | 'cancelled';

export type ForgotTimeRange = 'less_1h' | '1_to_4h' | 'more_4h';

export interface DoseHistoryEntry {
  id: string;
  occurrenceId?: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  status: DoseHistoryStatus;
  scheduledFor: string;
  takenAt?: string;
  delayMinutes?: number | null;
  pillsConsumed?: number;
  notes?: string;
  forgotTimeRange?: ForgotTimeRange;
  confirmedAt?: string;
  recordedAt: string;
}

/** @deprecated use DoseHistoryEntry */
export type DoseRecord = DoseHistoryEntry;

export interface MedicationFormData {
  name: string;
  dosage: string;
  medicationType: MedicationType;
  frequencyMode: FrequencyMode;
  frequencyPreset: FrequencyPreset;
  intervalHours: number;
  firstDoseTime: string;
  customTimes?: string[];
  stockTotal: number;
  pillsPerDose: number;
  startDate: string;
  notes?: string;
}

export interface UpcomingDose {
  medication: Medication;
  nextDoseAt: Date;
  isNext: boolean;
  remainingDoses: number;
  stockRunsOutAt: Date | null;
  isLowStock: boolean;
  hasMissedDoses: boolean;
  nextOccurrence?: DoseOccurrence;
}

export interface GroupedDoseItem {
  medication: Medication;
  occurrence: DoseOccurrence;
}

export interface GroupedDoseSlot {
  slotKey: string;
  scheduledFor: string;
  items: GroupedDoseItem[];
}

export interface TreatmentCompletionSummary {
  medicationId: string;
  medicationName: string;
  durationDays: number;
  expectedDoses: number;
  takenDoses: number;
  lateDoses: number;
  missedDoses: number;
  adherencePercent: number;
  completedAt: string;
}

export interface PendingScheduleChange {
  medicationId: string;
  data: MedicationFormData;
  reason: 'schedule_edit' | 'timezone_change';
}

export const FORGOT_TIME_RANGE_OPTIONS: { value: ForgotTimeRange; label: string }[] = [
  { value: 'less_1h', label: 'Menos de 1 hora' },
  { value: '1_to_4h', label: 'Entre 1 e 4 horas' },
  { value: 'more_4h', label: 'Mais de 4 horas' },
];

export const MEDICATION_TYPE_OPTIONS: {
  value: MedicationType;
  label: string;
  unit: string;
  icon: string;
}[] = [
  { value: 'tablet', label: 'Comprimido', unit: 'comprimido(s)', icon: 'ellipse' },
  { value: 'capsule', label: 'Cápsula', unit: 'cápsula(s)', icon: 'medical' },
  { value: 'drops', label: 'Gotas', unit: 'gota(s)', icon: 'water-outline' },
  { value: 'syrup', label: 'Xarope', unit: 'ml', icon: 'flask-outline' },
  { value: 'other', label: 'Outros', unit: 'unidade(s)', icon: 'help-circle-outline' },
];

export const FREQUENCY_PRESET_OPTIONS: {
  value: FrequencyPreset;
  label: string;
  intervalHours?: number;
}[] = [
  { value: '8', label: 'A cada 8 horas', intervalHours: 8 },
  { value: '12', label: 'A cada 12 horas', intervalHours: 12 },
  { value: '24', label: 'A cada 24 horas', intervalHours: 24 },
  { value: 'custom', label: 'Horários personalizados' },
];
