import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/contexts/toast-context';
import {
  applyScheduleRecalculation,
  bootstrapOccurrences,
  getAlarmSnoozeMs,
  getNextActionableOccurrence,
  getNextPendingOccurrence,
  reconcileMissedOccurrences,
  refreshMedicationOccurrences,
  snoozeOccurrence,
  updateOccurrenceStatus,
} from '@/lib/dose-occurrences';
import {
  buildForgotObservation,
  detectNewlyCompletedTreatments,
  getCurrentGroupedSlots,
  getDeviceTimezoneOffset,
  hasScheduleConfigChange,
} from '@/lib/dose-intelligence';
import {
  buildAdherenceReport,
  buildTreatmentCalendar,
  buildUnifiedHistory,
  createCancelledHistoryEntry,
  createMissedHistoryEntry,
  createTakenHistoryEntry,
  type AdherenceReport,
  type TreatmentCalendarDay,
} from '@/lib/adherence-engine';
import {
  buildMedicationFromForm,
  generateId,
  recalculateExpectedEndDate,
  toDateOnlyIso,
} from '@/lib/medication-utils';
import { getNextScheduledDose } from '@/lib/schedule-engine';
import {
  cancelMedicationNotifications,
  cancelOccurrenceAlarms,
  requestNotificationPermissions,
  scheduleAlarmChain,
  syncAllGroupedAlarmNotifications,
  type AlarmNotificationPayload,
  type GroupAlarmNotificationPayload,
} from '@/lib/notifications';
import {
  addDoseRecord,
  acknowledgeTreatment,
  getAcknowledgedTreatmentIds,
  getDoseHistory,
  getDoseOccurrences,
  getMedications,
  getStoredTimezoneOffset,
  removeOccurrencesForMedication,
  saveDoseOccurrences,
  saveMedications,
  saveTimezoneOffset,
  updateDoseHistoryNotes,
} from '@/lib/storage';
import type {
  AlarmActionId,
  DoseHistoryEntry,
  DoseOccurrence,
  ForgotTimeRange,
  GroupedDoseSlot,
  Medication,
  MedicationFormData,
  PendingScheduleChange,
  ScheduleRecalcMode,
  TreatmentCompletionSummary,
} from '@/types';

interface MedicationsContextValue {
  medications: Medication[];
  doseHistory: DoseHistoryEntry[];
  doseOccurrences: DoseOccurrence[];
  unifiedHistory: DoseHistoryEntry[];
  treatmentCalendar: TreatmentCalendarDay[];
  adherenceReport: AdherenceReport;
  activeGroupedSlots: GroupedDoseSlot[];
  forgotDoseTarget: { medicationId: string; occurrenceId: string; medicationName: string; scheduledFor: string } | null;
  pendingScheduleChange: PendingScheduleChange | null;
  treatmentCompletionSummary: TreatmentCompletionSummary | null;
  loading: boolean;
  addMedication: (data: MedicationFormData) => Promise<void>;
  updateMedication: (id: string, data: MedicationFormData) => Promise<'applied' | 'needs_choice'>;
  applyScheduleChange: (mode: ScheduleRecalcMode) => Promise<void>;
  cancelScheduleChange: () => void;
  deleteMedication: (id: string) => Promise<void>;
  pauseMedication: (id: string) => Promise<void>;
  resumeMedication: (id: string) => Promise<void>;
  finalizeTreatment: (id: string) => Promise<void>;
  takeDose: (id: string, occurrenceId?: string) => Promise<void>;
  takeAllInGroup: (slotKey: string) => Promise<void>;
  markDoseForgotten: (medicationId: string, forgotTimeRange: ForgotTimeRange, occurrenceId?: string) => Promise<void>;
  openForgotDoseFlow: (medicationId: string, occurrenceId?: string) => void;
  closeForgotDoseFlow: () => void;
  openGroupedDoseFlow: (slotKey: string) => void;
  closeGroupedDoseFlow: () => void;
  activeGroupedSlot: GroupedDoseSlot | null;
  handleAlarmAction: (actionId: AlarmActionId, payload: AlarmNotificationPayload) => Promise<void>;
  handleGroupAlarmAction: (actionId: AlarmActionId, payload: GroupAlarmNotificationPayload) => Promise<void>;
  reconcileAlarms: () => Promise<void>;
  acknowledgeTreatmentComplete: () => Promise<void>;
  scheduleEditResolvedId: string | null;
  clearScheduleEditResolved: () => void;
  updateHistoryNotes: (entryId: string, notes: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const MedicationsContext = createContext<MedicationsContextValue | null>(null);

export function MedicationsProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistoryEntry[]>([]);
  const [doseOccurrences, setDoseOccurrences] = useState<DoseOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [forgotDoseTarget, setForgotDoseTarget] = useState<MedicationsContextValue['forgotDoseTarget']>(null);
  const [pendingScheduleChange, setPendingScheduleChange] = useState<PendingScheduleChange | null>(null);
  const [activeGroupedSlotKey, setActiveGroupedSlotKey] = useState<string | null>(null);
  const [treatmentCompletionSummary, setTreatmentCompletionSummary] =
    useState<TreatmentCompletionSummary | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [scheduleEditResolvedId, setScheduleEditResolvedId] = useState<string | null>(null);

  const persistOccurrences = useCallback(async (occurrences: DoseOccurrence[]) => {
    await saveDoseOccurrences(occurrences);
    setDoseOccurrences(occurrences);
  }, []);

  const persistMedications = useCallback(async (updated: Medication[]) => {
    await saveMedications(updated);
    setMedications(updated);
  }, []);

  const syncAllAlarms = useCallback(
    async (meds: Medication[], occurrences: DoseOccurrence[]): Promise<Medication[]> => {
      return syncAllGroupedAlarmNotifications(meds, occurrences);
    },
    [],
  );

  const checkTreatmentCompletions = useCallback(
    async (meds: Medication[], occurrences: DoseOccurrence[], history: DoseHistoryEntry[]) => {
      const ack = await getAcknowledgedTreatmentIds();
      setAcknowledgedIds(ack);
      const completed = detectNewlyCompletedTreatments(meds, occurrences, history, ack);
      if (completed.length > 0) {
        const summary = completed[0];
        setTreatmentCompletionSummary(summary);
        const updatedMeds = meds.map((m) =>
          m.id === summary.medicationId
            ? { ...m, treatmentCompletedAt: summary.completedAt }
            : m,
        );
        await saveMedications(updatedMeds);
        setMedications(updatedMeds);
      }
    },
    [],
  );

  const checkTimezoneChange = useCallback(async () => {
    const current = getDeviceTimezoneOffset();
    const stored = await getStoredTimezoneOffset();
    if (stored != null && stored !== current && medications.length > 0) {
      const medWithPending = medications.find((m) =>
        doseOccurrences.some((o) => o.medicationId === m.id && o.status === 'pending'),
      );
      if (medWithPending) {
        setPendingScheduleChange({
          medicationId: medWithPending.id,
          data: {
            name: medWithPending.name,
            dosage: medWithPending.dosage,
            medicationType: medWithPending.medicationType,
            frequencyMode: medWithPending.frequencyMode,
            frequencyPreset: medWithPending.frequencyPreset,
            intervalHours: medWithPending.intervalHours,
            firstDoseTime: medWithPending.firstDoseTime,
            customTimes: medWithPending.customTimes,
            stockTotal: medWithPending.stockTotal,
            pillsPerDose: medWithPending.pillsPerDose,
            startDate: medWithPending.startDate,
            notes: medWithPending.notes,
          },
          reason: 'timezone_change',
        });
      }
    }
    await saveTimezoneOffset(current);
  }, [doseOccurrences, medications]);

  const refresh = useCallback(async () => {
    const [meds, history, occurrencesRaw, ack] = await Promise.all([
      getMedications(),
      getDoseHistory(),
      getDoseOccurrences(),
      getAcknowledgedTreatmentIds(),
    ]);
    setAcknowledgedIds(ack);
    const now = new Date();
    let occurrences = bootstrapOccurrences(meds, occurrencesRaw, now);
    for (const med of meds) {
      if (med.stockTotal > 0) {
        occurrences = refreshMedicationOccurrences(med, occurrences, now);
      }
    }
    occurrences = reconcileMissedOccurrences(occurrences, meds, now);
    const syncedMeds = await syncAllAlarms(meds, occurrences);
    await saveMedications(syncedMeds);
    await saveDoseOccurrences(occurrences);
    setMedications(syncedMeds);
    setDoseHistory(history);
    setDoseOccurrences(occurrences);
    await saveTimezoneOffset(getDeviceTimezoneOffset());
    await checkTreatmentCompletions(syncedMeds, occurrences, history);
  }, [checkTreatmentCompletions, syncAllAlarms]);

  useEffect(() => {
    (async () => {
      await requestNotificationPermissions();
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const addMedication = useCallback(
    async (data: MedicationFormData) => {
      const now = new Date();
      const base = buildMedicationFromForm(data);
      const scheduleAnchor = parseDateForSchedule(data.startDate, now);

      let medication: Medication = {
        id: generateId(),
        ...base,
        initialStock: data.stockTotal,
        nextDoseAt: getNextScheduledDose(base, scheduleAnchor).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      let occurrences = refreshMedicationOccurrences(medication, doseOccurrences, now);
      const allMeds = [...medications, medication];
      const synced = await syncAllAlarms(allMeds, occurrences);
      medication = synced.find((m) => m.id === medication.id) ?? medication;

      await persistMedications(synced);
      await persistOccurrences(occurrences);
      showToast('Medicamento cadastrado com alarmes agendados!', 'success');
    },
    [doseOccurrences, medications, persistMedications, persistOccurrences, showToast],
  );

  const applyMedicationUpdate = useCallback(
    async (id: string, data: MedicationFormData, mode: ScheduleRecalcMode) => {
      const existing = medications.find((m) => m.id === id);
      if (!existing) return;

      const now = new Date();
      const base = buildMedicationFromForm(data, existing);
      const scheduleAnchor = parseDateForSchedule(data.startDate, now);

      let updated: Medication = {
        ...existing,
        ...base,
        stockTotal: data.stockTotal,
        nextDoseAt: getNextScheduledDose(base, scheduleAnchor).toISOString(),
        updatedAt: now.toISOString(),
        deviceTimezoneOffset: getDeviceTimezoneOffset(),
      };

      let occurrences =
        mode === 'recalculate'
          ? refreshMedicationOccurrences(updated, doseOccurrences, now)
          : applyScheduleRecalculation(updated, doseOccurrences, 'keep', now);

      const synced = await syncAllAlarms(
        medications.map((m) => (m.id === id ? updated : m)),
        occurrences,
      );
      updated = synced.find((m) => m.id === id) ?? updated;

      await persistMedications(synced);
      await persistOccurrences(occurrences);
      await checkTreatmentCompletions(synced, occurrences, doseHistory);
      showToast('Medicamento atualizado!', 'success');
    },
    [
      checkTreatmentCompletions,
      doseHistory,
      doseOccurrences,
      medications,
      persistMedications,
      persistOccurrences,
      showToast,
      syncAllAlarms,
    ],
  );

  const updateMedication = useCallback(
    async (id: string, data: MedicationFormData): Promise<'applied' | 'needs_choice'> => {
      const existing = medications.find((m) => m.id === id);
      if (!existing) return 'applied';

      if (hasScheduleConfigChange(existing, data)) {
        setPendingScheduleChange({ medicationId: id, data, reason: 'schedule_edit' });
        return 'needs_choice';
      }

      await applyMedicationUpdate(id, data, 'recalculate');
      return 'applied';
    },
    [applyMedicationUpdate, medications],
  );

  const applyScheduleChange = useCallback(
    async (mode: ScheduleRecalcMode) => {
      if (!pendingScheduleChange) return;
      const { medicationId, data, reason } = pendingScheduleChange;
      if (reason === 'timezone_change') {
        for (const med of medications) {
          const updatedData: MedicationFormData = {
            name: med.name,
            dosage: med.dosage,
            medicationType: med.medicationType,
            frequencyMode: med.frequencyMode,
            frequencyPreset: med.frequencyPreset,
            intervalHours: med.intervalHours,
            firstDoseTime: med.firstDoseTime,
            customTimes: med.customTimes,
            stockTotal: med.stockTotal,
            pillsPerDose: med.pillsPerDose,
            startDate: med.startDate,
            notes: med.notes,
          };
          await applyMedicationUpdate(med.id, updatedData, mode);
        }
        await saveTimezoneOffset(getDeviceTimezoneOffset());
      } else {
        await applyMedicationUpdate(medicationId, data, mode);
        if (reason === 'schedule_edit') setScheduleEditResolvedId(medicationId);
      }
      setPendingScheduleChange(null);
    },
    [applyMedicationUpdate, medications, pendingScheduleChange],
  );

  const clearScheduleEditResolved = useCallback(() => setScheduleEditResolvedId(null), []);

  const cancelScheduleChange = useCallback(() => {
    setPendingScheduleChange(null);
  }, []);

  const deleteMedication = useCallback(
    async (id: string) => {
      const med = medications.find((m) => m.id === id);
      const now = new Date();
      const pendingOccurrences = doseOccurrences.filter(
        (o) => o.medicationId === id && o.status === 'pending',
      );

      if (med) {
        await cancelMedicationNotifications(med, doseOccurrences);
        for (const occ of pendingOccurrences) {
          const cancelled = createCancelledHistoryEntry(med, occ, now);
          await addDoseRecord(cancelled);
        }
      }

      await removeOccurrencesForMedication(id);
      await persistMedications(medications.filter((m) => m.id !== id));
      setDoseOccurrences((o) => o.filter((occ) => occ.medicationId !== id));
      if (pendingOccurrences.length > 0) {
        const history = await getDoseHistory();
        setDoseHistory(history);
      }
      showToast('Medicamento removido.', 'info');
    },
    [doseOccurrences, medications, persistMedications, showToast],
  );

  const pauseMedication = useCallback(
    async (id: string) => {
      const med = medications.find((m) => m.id === id);
      if (!med) return;
      const now = new Date().toISOString();
      await cancelMedicationNotifications(med, doseOccurrences);
      const updated = medications.map((m) =>
        m.id === id ? { ...m, treatmentStatus: 'paused' as const, pausedAt: now, updatedAt: now } : m,
      );
      await persistMedications(updated);
      showToast(`${med.name} pausado.`, 'info');
    },
    [doseOccurrences, medications, persistMedications, showToast],
  );

  const resumeMedication = useCallback(
    async (id: string) => {
      const med = medications.find((m) => m.id === id);
      if (!med) return;
      const now = new Date();
      let updatedMed: Medication = {
        ...med,
        treatmentStatus: 'active',
        pausedAt: null,
        updatedAt: now.toISOString(),
      };
      const synced = await syncAllAlarms(
        medications.map((m) => (m.id === id ? updatedMed : m)),
        doseOccurrences,
      );
      updatedMed = synced.find((m) => m.id === id) ?? updatedMed;
      await persistMedications(synced);
      showToast(`${med.name} reativado!`, 'success');
    },
    [doseOccurrences, medications, persistMedications, showToast, syncAllAlarms],
  );

  const finalizeTreatment = useCallback(
    async (id: string) => {
      const med = medications.find((m) => m.id === id);
      if (!med) return;
      const now = new Date();
      await cancelMedicationNotifications(med, doseOccurrences);
      const updatedMed: Medication = {
        ...med,
        treatmentStatus: 'completed',
        treatmentCompletedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      const synced = await syncAllAlarms(
        medications.map((m) => (m.id === id ? updatedMed : m)),
        doseOccurrences,
      );
      await persistMedications(synced);
      await checkTreatmentCompletions(synced, doseOccurrences, doseHistory);
      showToast(`Tratamento de ${med.name} finalizado.`, 'success');
    },
    [checkTreatmentCompletions, doseHistory, doseOccurrences, medications, persistMedications, showToast, syncAllAlarms],
  );

  const confirmOccurrenceTaken = useCallback(
    async (
      med: Medication,
      occurrence: DoseOccurrence,
      takenAt: Date,
    ): Promise<[Medication, DoseOccurrence[]]> => {
      if (med.stockTotal < med.pillsPerDose) {
        showToast('Estoque insuficiente para esta dose.', 'error');
        return [med, doseOccurrences];
      }

      await cancelOccurrenceAlarms(occurrence.id);

      let updatedOccurrences = updateOccurrenceStatus(doseOccurrences, occurrence.id, 'taken', {
        takenAt: takenAt.toISOString(),
      });

      let updatedMed = recalculateExpectedEndDate({
        ...med,
        stockTotal: med.stockTotal - med.pillsPerDose,
        updatedAt: takenAt.toISOString(),
      });

      const nextOcc = getNextPendingOccurrence(updatedOccurrences, med.id);
      updatedMed = {
        ...updatedMed,
        nextDoseAt: nextOcc
          ? nextOcc.scheduledFor
          : getNextScheduledDose(updatedMed, takenAt).toISOString(),
      };

      updatedOccurrences = refreshMedicationOccurrences(updatedMed, updatedOccurrences, takenAt);
      
      // Sincroniza alarmes: como o nextDoseAt mudou, o novo alarme nativo será agendado
      const syncedMeds = await syncAllAlarms(
        medications.map((m) => (m.id === med.id ? updatedMed : m)),
        updatedOccurrences,
      );
      updatedMed = syncedMeds.find((m) => m.id === med.id) ?? updatedMed;

      const record = createTakenHistoryEntry(med, occurrence, takenAt);

      await addDoseRecord(record);
      await persistMedications(syncedMeds);
      await persistOccurrences(updatedOccurrences);
      setDoseHistory((h) => [record, ...h.filter((e) => e.occurrenceId !== occurrence.id)]);
      await checkTreatmentCompletions(syncedMeds, updatedOccurrences, [
        record,
        ...doseHistory.filter((e) => e.occurrenceId !== occurrence.id),
      ]);

      return [updatedMed, updatedOccurrences];
    },
    [
      checkTreatmentCompletions,
      doseHistory,
      doseOccurrences,
      medications,
      persistMedications,
      persistOccurrences,
      showToast,
      syncAllAlarms,
    ],
  );

  const markOccurrenceMissed = useCallback(
    async (
      med: Medication,
      occurrence: DoseOccurrence,
      now: Date,
      forgotTimeRange?: ForgotTimeRange,
    ): Promise<void> => {
      await cancelOccurrenceAlarms(occurrence.id);

      let updatedOccurrences = updateOccurrenceStatus(doseOccurrences, occurrence.id, 'missed', {
        missedAt: now.toISOString(),
      });

      const nextOcc = getNextPendingOccurrence(updatedOccurrences, med.id);
      let updatedMed: Medication = {
        ...med,
        nextDoseAt: nextOcc
          ? nextOcc.scheduledFor
          : getNextScheduledDose(med, now).toISOString(),
        updatedAt: now.toISOString(),
      };

      updatedOccurrences = refreshMedicationOccurrences(updatedMed, updatedOccurrences, now);
      
      // Sincroniza alarmes: agenda o próximo alarme nativo após marcar como esquecida
      const syncedMeds = await syncAllAlarms(
        medications.map((m) => (m.id === med.id ? updatedMed : m)),
        updatedOccurrences,
      );
      updatedMed = syncedMeds.find((m) => m.id === med.id) ?? updatedMed;

      const observation = forgotTimeRange
        ? buildForgotObservation(forgotTimeRange, now)
        : undefined;
      const record = createMissedHistoryEntry(med, occurrence, now, {
        forgotTimeRange,
        notes: observation,
      });
      await addDoseRecord(record);
      setDoseHistory((h) => [record, ...h.filter((e) => e.occurrenceId !== occurrence.id)]);

      await persistMedications(syncedMeds);
      await persistOccurrences(updatedOccurrences);
    },
    [doseOccurrences, medications, persistMedications, persistOccurrences, syncAllAlarms],
  );

  const openForgotDoseFlow = useCallback(
    (medicationId: string, occurrenceId?: string) => {
      const med = medications.find((m) => m.id === medicationId);
      if (!med) return;
      const now = new Date();
      const occurrence =
        (occurrenceId ? doseOccurrences.find((o) => o.id === occurrenceId) : undefined) ??
        getNextActionableOccurrence(doseOccurrences, medicationId, now, med);
      if (!occurrence) {
        showToast('Nenhuma dose para marcar como esquecida.', 'info');
        return;
      }
      setForgotDoseTarget({
        medicationId,
        occurrenceId: occurrence.id,
        medicationName: med.name,
        scheduledFor: occurrence.scheduledFor,
      });
    },
    [doseOccurrences, medications, showToast],
  );

  const closeForgotDoseFlow = useCallback(() => setForgotDoseTarget(null), []);

  const markDoseForgotten = useCallback(
    async (medicationId: string, forgotTimeRange: ForgotTimeRange, occurrenceId?: string) => {
      const med = medications.find((m) => m.id === medicationId);
      if (!med) return;
      const now = new Date();
      const occurrence =
        (occurrenceId ? doseOccurrences.find((o) => o.id === occurrenceId) : undefined) ??
        getNextActionableOccurrence(doseOccurrences, medicationId, now, med);
      if (!occurrence) return;

      await markOccurrenceMissed(med, occurrence, now, forgotTimeRange);
      setForgotDoseTarget(null);
      showToast(`${med.name} registrado como esquecido`, 'info');
    },
    [doseOccurrences, markOccurrenceMissed, medications, showToast],
  );

  const activeGroupedSlots = useMemo(
    () => getCurrentGroupedSlots(medications, doseOccurrences),
    [medications, doseOccurrences],
  );

  const activeGroupedSlot = useMemo(
    () => activeGroupedSlots.find((g) => g.slotKey === activeGroupedSlotKey) ?? null,
    [activeGroupedSlotKey, activeGroupedSlots],
  );

  const openGroupedDoseFlow = useCallback((slotKey: string) => {
    setActiveGroupedSlotKey(slotKey);
  }, []);

  const closeGroupedDoseFlow = useCallback(() => setActiveGroupedSlotKey(null), []);

  const takeAllInGroup = useCallback(
    async (slotKey: string) => {
      const group = getCurrentGroupedSlots(medications, doseOccurrences).find(
        (g) => g.slotKey === slotKey,
      );
      if (!group) return;
      const now = new Date();
      for (const { medication, occurrence } of group.items) {
        if (occurrence.status === 'pending' || occurrence.status === 'missed') {
          await confirmOccurrenceTaken(medication, occurrence, now);
        }
      }
      setActiveGroupedSlotKey(null);
      showToast(`${group.items.length} medicamentos registrados!`, 'success');
    },
    [confirmOccurrenceTaken, doseOccurrences, medications, showToast],
  );

  const handleGroupAlarmAction = useCallback(
    async (actionId: AlarmActionId, payload: GroupAlarmNotificationPayload) => {
      if (actionId === 'TOMEI_TODOS') {
        await takeAllInGroup(payload.groupSlotKey);
        return;
      }
      if (actionId === 'REGISTRAR_INDIVIDUAL') {
        openGroupedDoseFlow(payload.groupSlotKey);
      }
    },
    [openGroupedDoseFlow, takeAllInGroup],
  );

  const takeDose = useCallback(
    async (id: string, occurrenceId?: string) => {
      const med = medications.find((m) => m.id === id);
      if (!med) return;

      const now = new Date();
      const occurrence =
        (occurrenceId ? doseOccurrences.find((o) => o.id === occurrenceId) : undefined) ??
        getNextActionableOccurrence(doseOccurrences, id, now, med);

      if (!occurrence) {
        showToast('Nenhuma dose pendente encontrada.', 'info');
        return;
      }

      await confirmOccurrenceTaken(med, occurrence, now);
      const status =
        new Date(now).getTime() - new Date(occurrence.scheduledFor).getTime() > 5 * 60 * 1000
          ? 'atrasada'
          : '';
      showToast(
        status ? `Dose atrasada de ${med.name} registrada!` : `Dose de ${med.name} registrada!`,
        'success',
      );
    },
    [confirmOccurrenceTaken, doseOccurrences, medications, showToast],
  );

  const handleAlarmAction = useCallback(
    async (actionId: AlarmActionId, payload: AlarmNotificationPayload) => {
      const med = medications.find((m) => m.id === payload.medicationId);
      const occurrence = doseOccurrences.find((o) => o.id === payload.occurrenceId);
      if (!med || !occurrence) return;

      if (occurrence.status !== 'pending' && actionId !== 'ESQUECI' && actionId !== 'ESQUECI_FOLLOWUP') {
        return;
      }

      const now = new Date();

      switch (actionId) {
        case 'TOMEI_AGORA':
        case 'TOMEI': {
          await confirmOccurrenceTaken(med, occurrence, now);
          showToast(`Dose de ${med.name} confirmada!`, 'success');
          break;
        }
        case 'LEMBRAR_DEPOIS': {
          const snoozeMs = getAlarmSnoozeMs(med);
          await cancelOccurrenceAlarms(occurrence.id);
          let updatedOccurrences = snoozeOccurrence(doseOccurrences, occurrence.id, snoozeMs, now);
          const snoozed = updatedOccurrences.find((o) => o.id === occurrence.id);
          if (snoozed) {
            await scheduleAlarmChain(med, snoozed);
          }
          await persistOccurrences(updatedOccurrences);
          showToast(`Lembrete adiado por ${Math.round(snoozeMs / 60_000)} min`, 'info');
          break;
        }
        case 'ESQUECI':
        case 'ESQUECI_FOLLOWUP': {
          openForgotDoseFlow(med.id, occurrence.id);
          break;
        }
        default:
          break;
      }
    },
    [
      confirmOccurrenceTaken,
      doseOccurrences,
      markOccurrenceMissed,
      medications,
      openForgotDoseFlow,
      persistOccurrences,
      showToast,
    ],
  );

  const reconcileAlarms = useCallback(async () => {
    const now = new Date();
    const reconciled = reconcileMissedOccurrences(doseOccurrences, medications, now);

    const newlyMissed = reconciled.filter((occ) => {
      const prev = doseOccurrences.find((p) => p.id === occ.id);
      return prev?.status === 'pending' && occ.status === 'missed';
    });

    if (newlyMissed.length === 0) return;

    let updatedMeds = [...medications];

    for (const occ of newlyMissed) {
      await cancelOccurrenceAlarms(occ.id);
      const med = medications.find((m) => m.id === occ.medicationId);
      if (med) {
        const record = createMissedHistoryEntry(med, occ, now);
        await addDoseRecord(record);
      }

      const medIdx = updatedMeds.findIndex((m) => m.id === occ.medicationId);
      if (medIdx < 0) continue;

      const nextOcc = getNextPendingOccurrence(reconciled, occ.medicationId);
      updatedMeds[medIdx] = {
        ...updatedMeds[medIdx],
        nextDoseAt: nextOcc
          ? nextOcc.scheduledFor
          : getNextScheduledDose(updatedMeds[medIdx], now).toISOString(),
        updatedAt: now.toISOString(),
      };
    }

    const syncedMeds = await syncAllAlarms(updatedMeds, reconciled);

    await persistMedications(syncedMeds);
    await persistOccurrences(reconciled);
    const history = await getDoseHistory();
    setDoseHistory(history);
  }, [doseOccurrences, medications, persistMedications, persistOccurrences, syncAllAlarms]);

  const acknowledgeTreatmentComplete = useCallback(async () => {
    if (!treatmentCompletionSummary) return;
    await acknowledgeTreatment(treatmentCompletionSummary.medicationId);
    setAcknowledgedIds((ids) => [...ids, treatmentCompletionSummary.medicationId]);
    setTreatmentCompletionSummary(null);
  }, [treatmentCompletionSummary]);

  useEffect(() => {
    if (!loading) void checkTimezoneChange();
  }, [checkTimezoneChange, loading]);

  const updateHistoryNotes = useCallback(
    async (entryId: string, notes: string) => {
      const updated = await updateDoseHistoryNotes(entryId, notes);
      setDoseHistory(updated);
    },
    [],
  );

  const unifiedHistory = useMemo(
    () => buildUnifiedHistory(medications, doseOccurrences, doseHistory),
    [medications, doseOccurrences, doseHistory],
  );

  const treatmentCalendar = useMemo(
    () => buildTreatmentCalendar(medications, doseOccurrences, doseHistory),
    [medications, doseOccurrences, doseHistory],
  );

  const adherenceReport = useMemo(
    () => buildAdherenceReport(medications, doseOccurrences, doseHistory),
    [medications, doseOccurrences, doseHistory],
  );

  const value = useMemo(
    () => ({
      medications,
      doseHistory,
      doseOccurrences,
      unifiedHistory,
      treatmentCalendar,
      adherenceReport,
      activeGroupedSlots,
      forgotDoseTarget,
      pendingScheduleChange,
      treatmentCompletionSummary,
      activeGroupedSlot,
      loading,
      addMedication,
      updateMedication,
      applyScheduleChange,
      cancelScheduleChange,
      deleteMedication,
      pauseMedication,
      resumeMedication,
      finalizeTreatment,
      takeDose,
      takeAllInGroup,
      markDoseForgotten,
      openForgotDoseFlow,
      closeForgotDoseFlow,
      openGroupedDoseFlow,
      closeGroupedDoseFlow,
      handleAlarmAction,
      handleGroupAlarmAction,
      reconcileAlarms,
      acknowledgeTreatmentComplete,
      scheduleEditResolvedId,
      clearScheduleEditResolved,
      updateHistoryNotes,
      refresh,
    }),
    [
      medications,
      doseHistory,
      doseOccurrences,
      unifiedHistory,
      treatmentCalendar,
      adherenceReport,
      activeGroupedSlots,
      forgotDoseTarget,
      pendingScheduleChange,
      treatmentCompletionSummary,
      activeGroupedSlot,
      loading,
      addMedication,
      updateMedication,
      applyScheduleChange,
      cancelScheduleChange,
      deleteMedication,
      pauseMedication,
      resumeMedication,
      finalizeTreatment,
      takeDose,
      takeAllInGroup,
      markDoseForgotten,
      openForgotDoseFlow,
      closeForgotDoseFlow,
      openGroupedDoseFlow,
      closeGroupedDoseFlow,
      handleAlarmAction,
      handleGroupAlarmAction,
      reconcileAlarms,
      acknowledgeTreatmentComplete,
      scheduleEditResolvedId,
      clearScheduleEditResolved,
      updateHistoryNotes,
      refresh,
    ],
  );

  return <MedicationsContext.Provider value={value}>{children}</MedicationsContext.Provider>;
}

function parseDateForSchedule(startDate: string, fallback: Date): Date {
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) return fallback;
  const today = toDateOnlyIso(fallback);
  const start = startDate.slice(0, 10);
  return start > today ? parsed : fallback;
}

export function useMedications(): MedicationsContextValue {
  const ctx = useContext(MedicationsContext);
  if (!ctx) throw new Error('useMedications deve ser usado dentro de MedicationsProvider');
  return ctx;
}
