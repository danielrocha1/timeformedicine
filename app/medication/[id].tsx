import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MedicationForm } from '@/components/medication-form';
import { StockIndicator } from '@/components/stock-indicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useMedications } from '@/contexts/medications-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  calculateStockRunsOutAt,
  formatAmountPerDose,
  formatDate,
  formatDailySchedule,
  formatShortDate,
  formatTime,
  getDailyScheduleTimes,
  getDosesPerDay,
  getMedicationTypeLabel,
  getRemainingDoses,
  getScheduleSummary,
  getTreatmentDurationDays,
  isLowStock,
  parseDateInput,
} from '@/lib/medication-utils';

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const { medications, updateMedication, deleteMedication, takeDose, openForgotDoseFlow, scheduleEditResolvedId, clearScheduleEditResolved } =
    useMedications();
  const [editing, setEditing] = useState(false);
  const medication = medications.find((m) => m.id === id);

  useEffect(() => {
    if (scheduleEditResolvedId === medication?.id) {
      setEditing(false);
      clearScheduleEditResolved();
    }
  }, [scheduleEditResolvedId, medication?.id, clearScheduleEditResolved]);

  if (!medication) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Medicamento não encontrado.</Text>
      </View>
    );
  }

  const remainingDoses = getRemainingDoses(medication);
  const stockRunsOutAt = calculateStockRunsOutAt(medication);
  const treatmentDays = getTreatmentDurationDays(medication);

  const handleDelete = () => {
    Alert.alert('Excluir medicamento', `Deseja remover ${medication.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteMedication(medication.id);
          router.back();
        },
      },
    ]);
  };

  if (editing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Editar medicamento' }} />
        <MedicationForm
          initial={medication}
          submitLabel="Salvar alterações"
          onSubmit={async (data) => {
            const result = await updateMedication(medication.id, data);
            if (result === 'applied') setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </View>
    );
  }
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: medication.name }} />

      <Card>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="medical" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{medication.name}</Text>
            <Text style={[styles.dosage, { color: colors.textSecondary }]}>{medication.dosage}</Text>
            <View style={[styles.typeBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                {getMedicationTypeLabel(medication.medicationType)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.detailText, { color: colors.text }]}>
          {formatAmountPerDose(medication.pillsPerDose, medication.medicationType)}
        </Text>
        {medication.notes && (
          <Text style={[styles.notes, { color: colors.textSecondary }]}>{medication.notes}</Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Agenda inteligente</Text>
        <DetailRow
          icon="repeat-outline"
          label="Frequência"
          value={getScheduleSummary(medication)}
          colors={colors}
        />
        <DetailRow
          icon="sunny-outline"
          label="Horários do dia"
          value={formatDailySchedule(getDailyScheduleTimes(medication))}
          colors={colors}
        />
        <DetailRow
          icon="layers-outline"
          label="Doses por dia"
          value={`${getDosesPerDay(medication)}x`}
          colors={colors}
        />
        <DetailRow
          icon="time-outline"
          label="Próxima dose"
          value={formatTime(new Date(medication.nextDoseAt))}
          colors={colors}
        />
        {stockRunsOutAt && (
          <DetailRow
            icon="alert-circle-outline"
            label="Estoque acaba em"
            value={formatDate(stockRunsOutAt)}
            colors={colors}
          />
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tratamento</Text>
        <DetailRow
          icon="calendar-outline"
          label="Início"
          value={formatShortDate(parseDateInput(medication.startDate))}
          colors={colors}
        />
        <DetailRow
          icon="flag-outline"
          label="Término previsto"
          value={
            medication.expectedEndDate
              ? formatDate(new Date(medication.expectedEndDate))
              : '—'
          }
          colors={colors}
        />
        {treatmentDays != null && (
          <DetailRow
            icon="hourglass-outline"
            label="Duração estimada"
            value={`${treatmentDays} dia${treatmentDays !== 1 ? 's' : ''}`}
            colors={colors}
          />
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Estoque</Text>
        <StockIndicator
          stockTotal={medication.stockTotal}
          pillsPerDose={medication.pillsPerDose}
          remainingDoses={remainingDoses}
          isLowStock={isLowStock(medication)}
          medicationType={medication.medicationType}
        />
        <Text style={[styles.initialStock, { color: colors.textSecondary }]}>
          Quantidade inicial: {medication.initialStock}
        </Text>
      </Card>

      <Button
        label="Tomei esta dose"
        icon="checkmark-circle"
        onPress={() => takeDose(medication.id)}
        disabled={medication.stockTotal < medication.pillsPerDose}
      />
      <Button
        label="Esqueci"
        icon="close-circle-outline"
        onPress={() => openForgotDoseFlow(medication.id)}
        variant="outline"
      />
      <Button label="Editar" icon="create-outline" onPress={() => setEditing(true)} variant="outline" />
      <Pressable onPress={handleDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
        <Text style={[styles.deleteText, { color: colors.danger }]}>Excluir medicamento</Text>
      </Pressable>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', marginBottom: Spacing.md },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '800' },
  dosage: { fontSize: 15, marginTop: 4 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  detailText: { fontSize: 15, marginBottom: Spacing.sm },
  notes: { fontSize: 14, fontStyle: 'italic', marginTop: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.sm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailLabel: { fontSize: 14, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  initialStock: { fontSize: 12, marginTop: Spacing.sm },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  deleteText: { fontSize: 16, fontWeight: '600' },
});
