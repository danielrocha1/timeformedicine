import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/contexts/toast-context';
import {
  calculateNextDose,
  calculateNextDoseAfterTaken,
  generateId,
} from '@/lib/medication-utils';
import {
  cancelMedicationNotifications,
  requestNotificationPermissions,
  syncMedicationNotifications,
} from '@/lib/notifications';
import {
  addDoseRecord,
  getDoseHistory,
  getMedications,
  removeDoseHistoryForMedication,
  saveMedications,
} from '@/lib/storage';
import type { DoseRecord, Medication, MedicationFormData } from '@/types';

interface MedicationsContextValue {
  medications: Medication[];
  doseHistory: DoseRecord[];
  loading: boolean;
  addMedication: (data: MedicationFormData) => Promise<void>;
  updateMedication: (id: string, data: MedicationFormData) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  takeDose: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const MedicationsContext = createContext<MedicationsContextValue | null>(null);

export function MedicationsProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [meds, history] = await Promise.all([getMedications(), getDoseHistory()]);
    setMedications(meds);
    setDoseHistory(history);
  }, []);

  useEffect(() => {
    (async () => {
      await requestNotificationPermissions();
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const persist = useCallback(async (updated: Medication[]) => {
    await saveMedications(updated);
    setMedications(updated);
  }, []);

  const addMedication = useCallback(
    async (data: MedicationFormData) => {
      const now = new Date();
      let medication: Medication = {
        id: generateId(),
        ...data,
        initialStock: data.stockTotal,
        nextDoseAt: calculateNextDose(now, data.intervalHours, data.firstDoseTime).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      medication = await syncMedicationNotifications(medication);
      await persist([...medications, medication]);
      showToast('Medicamento cadastrado com sucesso!', 'success');
    },
    [medications, persist, showToast],
  );

  const updateMedication = useCallback(
    async (id: string, data: MedicationFormData) => {
      const existing = medications.find((m) => m.id === id);
      if (!existing) return;
      const now = new Date();
      let updated: Medication = {
        ...existing,
        ...data,
        nextDoseAt: calculateNextDose(now, data.intervalHours, data.firstDoseTime).toISOString(),
        updatedAt: now.toISOString(),
      };
      updated = await syncMedicationNotifications(updated, existing);
      await persist(medications.map((m) => (m.id === id ? updated : m)));
      showToast('Medicamento atualizado!', 'success');
    },
    [medications, persist, showToast],
  );

  const deleteMedication = useCallback(
    async (id: string) => {
      const med = medications.find((m) => m.id === id);
      if (med) await cancelMedicationNotifications(med);
      await removeDoseHistoryForMedication(id);
      await persist(medications.filter((m) => m.id !== id));
      setDoseHistory((h) => h.filter((r) => r.medicationId !== id));
      showToast('Medicamento removido.', 'info');
    },
    [medications, persist, showToast],
  );

  const takeDose = useCallback(
    async (id: string) => {
      const med = medications.find((m) => m.id === id);
      if (!med) return;
      if (med.stockTotal < med.pillsPerDose) {
        showToast('Estoque insuficiente para esta dose.', 'error');
        return;
      }
      const now = new Date();
      let updated: Medication = {
        ...med,
        stockTotal: med.stockTotal - med.pillsPerDose,
        nextDoseAt: calculateNextDoseAfterTaken(med.intervalHours).toISOString(),
        updatedAt: now.toISOString(),
      };
      updated = await syncMedicationNotifications(updated, med);
      const record: DoseRecord = {
        id: generateId(),
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        takenAt: now.toISOString(),
        pillsConsumed: med.pillsPerDose,
      };
      await addDoseRecord(record);
      await persist(medications.map((m) => (m.id === id ? updated : m)));
      setDoseHistory((h) => [record, ...h]);
      showToast(`Dose de ${med.name} registrada!`, 'success');
    },
    [medications, persist, showToast],
  );

  const value = useMemo(
    () => ({
      medications,
      doseHistory,
      loading,
      addMedication,
      updateMedication,
      deleteMedication,
      takeDose,
      refresh,
    }),
    [medications, doseHistory, loading, addMedication, updateMedication, deleteMedication, takeDose, refresh],
  );

  return <MedicationsContext.Provider value={value}>{children}</MedicationsContext.Provider>;
}

export function useMedications(): MedicationsContextValue {
  const ctx = useContext(MedicationsContext);
  if (!ctx) throw new Error('useMedications deve ser usado dentro de MedicationsProvider');
  return ctx;
}
