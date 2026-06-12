export interface Medication {
  id: string;
  name: string;
  dosage: string;
  intervalHours: number;
  firstDoseTime: string;
  stockTotal: number;
  initialStock: number;
  pillsPerDose: number;
  notes?: string;
  nextDoseAt: string;
  doseNotificationId?: string;
  lowStockNotificationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoseRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  takenAt: string;
  pillsConsumed: number;
}

export interface MedicationFormData {
  name: string;
  dosage: string;
  intervalHours: number;
  firstDoseTime: string;
  stockTotal: number;
  pillsPerDose: number;
  notes?: string;
}

export interface UpcomingDose {
  medication: Medication;
  nextDoseAt: Date;
  isNext: boolean;
  remainingDoses: number;
  stockRunsOutAt: Date | null;
  isLowStock: boolean;
}
