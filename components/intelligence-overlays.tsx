import { useMedications } from '@/contexts/medications-context';
import {
  ForgotDoseModal,
  GroupedDoseModal,
  ScheduleChangeModal,
  TreatmentCompletedModal,
} from '@/components/intelligence-modals';

export function IntelligenceOverlays() {
  const {
    medications,
    forgotDoseTarget,
    closeForgotDoseFlow,
    markDoseForgotten,
    pendingScheduleChange,
    applyScheduleChange,
    cancelScheduleChange,
    activeGroupedSlot,
    closeGroupedDoseFlow,
    takeAllInGroup,
    takeDose,
    openForgotDoseFlow,
    treatmentCompletionSummary,
    acknowledgeTreatmentComplete,
  } = useMedications();

  const scheduleMed = pendingScheduleChange
    ? medications.find((m) => m.id === pendingScheduleChange.medicationId)
    : null;

  return (
    <>
      <ForgotDoseModal
        visible={!!forgotDoseTarget}
        medicationName={forgotDoseTarget?.medicationName ?? ''}
        scheduledFor={forgotDoseTarget?.scheduledFor ?? new Date().toISOString()}
        onConfirm={(range) => {
          if (forgotDoseTarget) {
            void markDoseForgotten(
              forgotDoseTarget.medicationId,
              range,
              forgotDoseTarget.occurrenceId,
            );
          }
        }}
        onCancel={closeForgotDoseFlow}
      />

      <ScheduleChangeModal
        visible={!!pendingScheduleChange}
        change={pendingScheduleChange}
        medicationName={scheduleMed?.name ?? 'Medicamentos'}
        onKeep={() => void applyScheduleChange('keep')}
        onRecalculate={() => void applyScheduleChange('recalculate')}
        onCancel={cancelScheduleChange}
      />

      <GroupedDoseModal
        visible={!!activeGroupedSlot}
        group={activeGroupedSlot}
        onTakeAll={() => {
          if (activeGroupedSlot) void takeAllInGroup(activeGroupedSlot.slotKey);
        }}
        onTakeOne={(medicationId, occurrenceId) => {
          void takeDose(medicationId, occurrenceId);
        }}
        onForgotOne={(medicationId, occurrenceId) => {
          openForgotDoseFlow(medicationId, occurrenceId);
        }}
        onClose={closeGroupedDoseFlow}
      />

      <TreatmentCompletedModal
        visible={!!treatmentCompletionSummary}
        summary={treatmentCompletionSummary}
        onClose={() => void acknowledgeTreatmentComplete()}
      />
    </>
  );
}
