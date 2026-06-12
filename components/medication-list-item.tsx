import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  formatDailySchedule,
  formatTime,
  getAmountUnitLabel,
  getDailyScheduleTimes,
  getRemainingDoses,
} from '@/lib/medication-utils';
import type { Medication, TreatmentStatus } from '@/types';

function statusLabel(status: TreatmentStatus | undefined): string {
  switch (status ?? 'active') {
    case 'paused':
      return 'Pausado';
    case 'completed':
      return 'Concluído';
    default:
      return 'Ativo';
  }
}

function statusColor(status: TreatmentStatus | undefined, colors: ReturnType<typeof useThemeColors>): string {
  switch (status ?? 'active') {
    case 'paused':
      return colors.warning;
    case 'completed':
      return colors.textSecondary;
    default:
      return colors.secondary;
  }
}

interface MedicationListItemProps {
  medication: Medication;
  onPress: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinalize: () => void;
  onDelete: () => void;
}

export function MedicationListItem({
  medication,
  onPress,
  onPause,
  onResume,
  onFinalize,
  onDelete,
}: MedicationListItemProps) {
  const colors = useThemeColors();
  const remaining = getRemainingDoses(medication);
  const unit = getAmountUnitLabel(medication.medicationType, medication.stockTotal);
  const st = medication.treatmentStatus ?? 'active';
  const stColor = statusColor(st, colors);

  const confirmDelete = () => {
    Alert.alert(
      'Excluir medicamento',
      'Tem certeza que deseja remover este medicamento? O histórico será preservado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  const confirmFinalize = () => {
    Alert.alert(
      'Finalizar tratamento',
      'Confirma que concluiu este tratamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: onFinalize },
      ],
    );
  };

  return (
    <Card>
      <Pressable onPress={onPress}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>💊 {medication.name}</Text>
          <View style={[styles.badge, { backgroundColor: `${stColor}22` }]}>
            <Text style={[styles.badgeText, { color: stColor }]}>{statusLabel(st)}</Text>
          </View>
        </View>
        <Text style={[styles.dosage, { color: colors.textSecondary }]}>{medication.dosage}</Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          Restante: {medication.stockTotal} {unit} · {remaining} doses
        </Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          Horários: {formatDailySchedule(getDailyScheduleTimes(medication))}
        </Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          Próxima: {formatTime(new Date(medication.nextDoseAt))}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {st === 'active' && (
          <ActionChip label="Pausar" icon="pause" onPress={onPause} colors={colors} />
        )}
        {st === 'paused' && (
          <ActionChip label="Retomar" icon="play" onPress={onResume} colors={colors} />
        )}
        {st !== 'completed' && (
          <ActionChip label="Finalizar" icon="flag" onPress={confirmFinalize} colors={colors} />
        )}
        <ActionChip label="Excluir" icon="trash" onPress={confirmDelete} colors={colors} danger />
      </View>
    </Card>
  );
}

function ActionChip({
  label,
  icon,
  onPress,
  colors,
  danger,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  danger?: boolean;
}) {
  const c = danger ? colors.danger : colors.primary;
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: `${c}15`, borderColor: `${c}44` }]}>
      <Ionicons name={icon} size={14} color={c} />
      <Text style={[styles.chipText, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  name: { fontSize: 18, fontWeight: '800', flex: 1 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dosage: { fontSize: 15, marginBottom: Spacing.xs },
  detail: { fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
});
