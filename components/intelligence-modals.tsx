import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { DOSE_STATUS_LABELS, formatDelayLabel } from '@/lib/adherence-engine';
import { formatTime } from '@/lib/medication-utils';
import type {
  ForgotTimeRange,
  GroupedDoseSlot,
  PendingScheduleChange,
  TreatmentCompletionSummary,
} from '@/types';
import { FORGOT_TIME_RANGE_OPTIONS } from '@/types';

interface ForgotDoseModalProps {
  visible: boolean;
  medicationName: string;
  scheduledFor: string;
  onConfirm: (range: ForgotTimeRange) => void;
  onCancel: () => void;
}

export function ForgotDoseModal({
  visible,
  medicationName,
  scheduledFor,
  onConfirm,
  onCancel,
}: ForgotDoseModalProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Esqueci o medicamento</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {medicationName} — programado às {formatTime(new Date(scheduledFor))}
          </Text>
          <Text style={[styles.question, { color: colors.text }]}>
            Quanto tempo passou desde o horário programado?
          </Text>
          {FORGOT_TIME_RANGE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => onConfirm(opt.value)}
              style={[styles.option, { borderColor: colors.border, backgroundColor: `${colors.danger}10` }]}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{opt.label}</Text>
            </Pressable>
          ))}
          <Button label="Cancelar" onPress={onCancel} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

interface ScheduleChangeModalProps {
  visible: boolean;
  change: PendingScheduleChange | null;
  medicationName: string;
  onKeep: () => void;
  onRecalculate: () => void;
  onCancel: () => void;
}

export function ScheduleChangeModal({
  visible,
  change,
  medicationName,
  onKeep,
  onRecalculate,
  onCancel,
}: ScheduleChangeModalProps) {
  const colors = useThemeColors();
  const isTimezone = change?.reason === 'timezone_change';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <Ionicons name="time-outline" size={32} color={colors.primary} style={styles.modalIcon} />
          <Text style={[styles.title, { color: colors.text }]}>
            {isTimezone ? 'Fuso horário alterado' : 'Horário alterado'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isTimezone
              ? 'Detectamos mudança de fuso horário no dispositivo.'
              : `Você alterou a agenda de ${medicationName}.`}
          </Text>
          <Text style={[styles.question, { color: colors.text }]}>
            Deseja manter os horários atuais ou recalcular baseado na nova configuração?
          </Text>
          <Button label="Manter horários atuais" onPress={onKeep} variant="outline" />
          <Button label="Recalcular horários" onPress={onRecalculate} style={styles.btnGap} />
          <Button label="Cancelar" onPress={onCancel} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

interface GroupedDoseModalProps {
  visible: boolean;
  group: GroupedDoseSlot | null;
  onTakeAll: () => void;
  onTakeOne: (medicationId: string, occurrenceId: string) => void;
  onForgotOne: (medicationId: string, occurrenceId: string) => void;
  onClose: () => void;
}

export function GroupedDoseModal({
  visible,
  group,
  onTakeAll,
  onTakeOne,
  onForgotOne,
  onClose,
}: GroupedDoseModalProps) {
  const colors = useThemeColors();
  if (!group) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.sheetTall, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {group.items.length} medicamentos agora
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Programado: {formatTime(new Date(group.scheduledFor))}
          </Text>
          <ScrollView style={styles.groupList}>
            {group.items.map(({ medication, occurrence }) => (
              <View
                key={occurrence.id}
                style={[styles.groupItem, { borderColor: colors.border, backgroundColor: `${colors.primary}08` }]}
              >
                <View style={styles.groupItemInfo}>
                  <Text style={[styles.groupMedName, { color: colors.text }]}>
                    💊 {medication.name}
                  </Text>
                  <Text style={[styles.groupMedDose, { color: colors.textSecondary }]}>
                    {medication.dosage}
                  </Text>
                </View>
                <View style={styles.groupActions}>
                  <Pressable
                    onPress={() => onTakeOne(medication.id, occurrence.id)}
                    style={[styles.miniBtn, { backgroundColor: colors.secondary }]}
                  >
                    <Text style={styles.miniBtnText}>Tomei</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onForgotOne(medication.id, occurrence.id)}
                    style={[styles.miniBtn, { backgroundColor: colors.danger }]}
                  >
                    <Text style={styles.miniBtnText}>Esqueci</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          <Button label="Marcar todos como tomados" icon="checkmark-done" onPress={onTakeAll} />
          <Button label="Fechar" onPress={onClose} variant="ghost" style={styles.btnGap} />
        </View>
      </View>
    </Modal>
  );
}

interface TreatmentCompletedModalProps {
  visible: boolean;
  summary: TreatmentCompletionSummary | null;
  onClose: () => void;
}

export function TreatmentCompletedModal({ visible, summary, onClose }: TreatmentCompletedModalProps) {
  const colors = useThemeColors();
  if (!summary) return null;

  const adherenceColor =
    summary.adherencePercent >= 90
      ? colors.success
      : summary.adherencePercent >= 70
        ? colors.warning
        : colors.danger;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.overlayScroll}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={styles.celebrate}>✅</Text>
            <Text style={[styles.title, { color: colors.text }]}>Tratamento concluído</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{summary.medicationName}</Text>

            <View style={[styles.heroBox, { backgroundColor: `${adherenceColor}15` }]}>
              <Text style={[styles.heroPercent, { color: adherenceColor }]}>
                {summary.adherencePercent}%
              </Text>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>de adesão</Text>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryRow label="Duração" value={`${summary.durationDays} dias`} />
              <SummaryRow label="Doses previstas" value={String(summary.expectedDoses)} />
              <SummaryRow label="Tomadas" value={String(summary.takenDoses)} />
              <SummaryRow label="Atrasos" value={String(summary.lateDoses)} />
              <SummaryRow label="Esquecimentos" value={String(summary.missedDoses)} />
            </View>

            <Button label="Entendi" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function GroupedDoseBanner({
  group,
  onPress,
}: {
  group: GroupedDoseSlot;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.banner, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
    >
      <Ionicons name="medkit" size={22} color={colors.primary} />
      <View style={styles.bannerText}>
        <Text style={[styles.bannerTitle, { color: colors.text }]}>
          Você possui {group.items.length} medicamentos agora
        </Text>
        <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
          {formatTime(new Date(group.scheduledFor))} · Toque para registrar
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  overlayScroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  sheet: { borderRadius: BorderRadius.xl, padding: Spacing.lg },
  sheetTall: { maxHeight: '85%' },
  modalIcon: { alignSelf: 'center', marginBottom: Spacing.sm },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: Spacing.md },
  question: { fontSize: 16, fontWeight: '600', marginBottom: Spacing.md, textAlign: 'center' },
  option: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  optionText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  btnGap: { marginTop: Spacing.sm },
  groupList: { maxHeight: 280, marginBottom: Spacing.md },
  groupItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  groupItemInfo: { marginBottom: Spacing.sm },
  groupMedName: { fontSize: 16, fontWeight: '700' },
  groupMedDose: { fontSize: 13, marginTop: 2 },
  groupActions: { flexDirection: 'row', gap: Spacing.sm },
  miniBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' },
  miniBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  celebrate: { fontSize: 48, textAlign: 'center', marginBottom: Spacing.sm },
  heroBox: { alignItems: 'center', paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, marginVertical: Spacing.md },
  heroPercent: { fontSize: 42, fontWeight: '900' },
  heroLabel: { fontSize: 14, fontWeight: '600' },
  summaryGrid: { gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '700' },
  bannerSub: { fontSize: 12, marginTop: 2 },
});

export { DOSE_STATUS_LABELS, formatDelayLabel };
