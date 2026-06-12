import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
  formatDate,
  formatTime,
  getRemainingDoses,
  isLowStock,
} from '@/lib/medication-utils';

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const { medications, updateMedication, deleteMedication, takeDose } = useMedications();
  const [editing, setEditing] = useState(false);
  const medication = medications.find((m) => m.id === id);

  if (!medication) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Medicamento não encontrado.</Text>
      </View>
    );
  }

  const remainingDoses = getRemainingDoses(medication);
  const stockRunsOutAt = calculateStockRunsOutAt(medication);

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
            await updateMedication(medication.id, data);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: medication.name }} />
      <Card>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="medical" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{medication.name}</Text>
            <Text style={[styles.dosage, { color: colors.textSecondary }]}>{medication.dosage}</Text>
          </View>
        </View>
        <Text style={[styles.detailText, { color: colors.text }]}>A cada {medication.intervalHours} horas</Text>
        <Text style={[styles.detailText, { color: colors.text }]}>
          Próxima dose: {formatTime(new Date(medication.nextDoseAt))}
        </Text>
        {stockRunsOutAt && (
          <Text style={[styles.detailText, { color: colors.text }]}>
            Estoque acaba em ~{formatDate(stockRunsOutAt)}
          </Text>
        )}
        {medication.notes && <Text style={[styles.notes, { color: colors.textSecondary }]}>{medication.notes}</Text>}
      </Card>
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Estoque</Text>
        <StockIndicator
          stockTotal={medication.stockTotal}
          pillsPerDose={medication.pillsPerDose}
          remainingDoses={remainingDoses}
          isLowStock={isLowStock(medication)}
        />
      </Card>
      <Button label="Tomei esta dose" icon="checkmark-circle" onPress={() => takeDose(medication.id)} disabled={medication.stockTotal < medication.pillsPerDose} />
      <Button label="Editar" icon="create-outline" onPress={() => setEditing(true)} variant="outline" />
      <Pressable onPress={handleDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
        <Text style={[styles.deleteText, { color: colors.danger }]}>Excluir medicamento</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', marginBottom: Spacing.md },
  iconBox: { width: 56, height: 56, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  headerInfo: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '800' },
  dosage: { fontSize: 15, marginTop: 4 },
  detailText: { fontSize: 15, marginBottom: Spacing.sm },
  notes: { fontSize: 14, fontStyle: 'italic', marginTop: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.sm },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  deleteText: { fontSize: 16, fontWeight: '600' },
});
