import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FrequencySchedulePicker, type FrequencyScheduleValue } from '@/components/frequency-schedule-picker';
import { Input } from '@/components/ui/input';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  calculateExpectedEndDate,
  formatDate,
  formatShortDate,
  getAmountUnitLabel,
  inferMedicationPreset,
  parseDateInput,
  toDateOnlyIso,
} from '@/lib/medication-utils';
import { validateCustomTimes } from '@/lib/schedule-engine';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { MEDICATION_TYPE_OPTIONS, type Medication, type MedicationFormData, type MedicationType } from '@/types';

interface MedicationFormProps {
  initial?: Medication;
  onSubmit: (data: MedicationFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function buildInitialSchedule(initial?: Medication): FrequencyScheduleValue {
  return {
    frequencyPreset: initial ? inferMedicationPreset(initial) : '8',
    frequencyMode: initial?.frequencyMode ?? 'interval',
    intervalHours: initial?.intervalHours ?? 8,
    firstDoseTime: initial?.firstDoseTime ?? '08:00',
    customTimes: initial?.customTimes ?? [],
  };
}

export function MedicationForm({ initial, onSubmit, onCancel, submitLabel }: MedicationFormProps) {
  const colors = useThemeColors();
  const [name, setName] = useState(initial?.name ?? '');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [medicationType, setMedicationType] = useState<MedicationType>(initial?.medicationType ?? 'tablet');
  const [schedule, setSchedule] = useState<FrequencyScheduleValue>(() => buildInitialSchedule(initial));
  const [stockTotal, setStockTotal] = useState(String(initial?.stockTotal ?? ''));
  const [pillsPerDose, setPillsPerDose] = useState(String(initial?.pillsPerDose ?? '1'));
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? toDateOnlyIso(new Date()),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amountUnit = getAmountUnitLabel(medicationType, Number(pillsPerDose) || 1);

  const expectedEndPreview = useMemo(() => {
    const stock = Number(stockTotal);
    const perDose = Number(pillsPerDose);
    if (!stock || !perDose || !schedule.intervalHours) return null;
    return calculateExpectedEndDate(startDate, stock, perDose, schedule);
  }, [stockTotal, pillsPerDose, schedule, startDate]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Informe o nome';
    if (!dosage.trim()) next.dosage = 'Informe a dosagem';
    if (!schedule.intervalHours || schedule.intervalHours < 1 || schedule.intervalHours > 72) {
      next.interval = 'Intervalo entre 1 e 72 horas';
    }
    if (schedule.frequencyMode === 'fixed_times') {
      const timesError = validateCustomTimes(schedule.customTimes);
      if (timesError) next.times = timesError;
    }
    if (!stockTotal || Number(stockTotal) < 1) next.stock = 'Informe a quantidade disponível';
    if (!pillsPerDose || Number(pillsPerDose) <= 0) next.pills = 'Informe a quantidade por dose';
    if (!startDate) next.startDate = 'Informe a data de início';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        dosage: dosage.trim(),
        medicationType,
        frequencyMode: schedule.frequencyMode,
        frequencyPreset: schedule.frequencyPreset,
        intervalHours: schedule.intervalHours,
        firstDoseTime: schedule.firstDoseTime,
        customTimes:
          schedule.frequencyMode === 'fixed_times' ? schedule.customTimes : undefined,
        stockTotal: Number(stockTotal),
        pillsPerDose: Number(pillsPerDose),
        startDate,
        notes: notes.trim() || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.moduleTitle, { color: colors.primary }]}>Identificação</Text>
      <Input
        label="Nome do medicamento"
        placeholder="Ex: Paracetamol, Losartana..."
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <Input
        label="Dosagem"
        placeholder="Ex: 500mg, 10mg, 20mg/ml"
        value={dosage}
        onChangeText={setDosage}
        error={errors.dosage}
      />

      <Text style={[styles.sectionLabel, { color: colors.text }]}>Tipo do medicamento</Text>
      <View style={styles.typeGrid}>
        {MEDICATION_TYPE_OPTIONS.map((option) => {
          const selected = medicationType === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setMedicationType(option.value)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: selected ? `${colors.primary}18` : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={selected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeLabel,
                  { color: selected ? colors.primary : colors.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.moduleTitle, { color: colors.primary }]}>Estoque e dose</Text>
      <Input
        label="Quantidade inicial disponível"
        placeholder={
          medicationType === 'syrup'
            ? 'Ex: 120 (ml)'
            : medicationType === 'drops'
              ? 'Ex: 300 (gotas)'
              : 'Ex: 30 (cartela)'
        }
        keyboardType="decimal-pad"
        value={stockTotal}
        onChangeText={setStockTotal}
        error={errors.stock}
      />
      <Input
        label={`Quantidade por dose (${amountUnit})`}
        placeholder="Ex: 1"
        keyboardType="decimal-pad"
        value={pillsPerDose}
        onChangeText={setPillsPerDose}
        error={errors.pills}
      />

      <Text style={[styles.moduleTitle, { color: colors.primary }]}>Período do tratamento</Text>
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Data de início</Text>
      <Pressable
        onPress={() => setShowDatePicker(true)}
        style={[styles.timeButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={[styles.timeButtonText, { color: colors.text }]}>
          {formatShortDate(parseDateInput(startDate))}
        </Text>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker
          value={parseDateInput(startDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            if (Platform.OS === 'android') setShowDatePicker(false);
            if (date) setStartDate(toDateOnlyIso(date));
          }}
        />
      )}
      {Platform.OS === 'ios' && showDatePicker && (
        <Button label="Confirmar data" onPress={() => setShowDatePicker(false)} variant="outline" />
      )}

      <View style={[styles.endPreview, { backgroundColor: `${colors.secondary}15`, borderColor: colors.secondary }]}>
        <Ionicons name="flag-outline" size={20} color={colors.secondary} />
        <View style={styles.endPreviewText}>
          <Text style={[styles.endPreviewLabel, { color: colors.textSecondary }]}>
            Término previsto (automático)
          </Text>
          <Text style={[styles.endPreviewValue, { color: colors.text }]}>
            {expectedEndPreview ? formatDate(expectedEndPreview) : 'Preencha estoque e intervalo'}
          </Text>
        </View>
      </View>

      <Text style={[styles.moduleTitle, { color: colors.primary }]}>Agenda inteligente</Text>
      <FrequencySchedulePicker
        value={schedule}
        onChange={setSchedule}
        intervalError={errors.interval}
        timesError={errors.times}
      />

      <Text style={[styles.moduleTitle, { color: colors.primary }]}>Observações</Text>
      <Input
        label="Observações do usuário (opcional)"
        placeholder="Ex: Tomar após as refeições, evitar álcool..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.notesInput}
      />

      <Button label={submitLabel} onPress={handleSubmit} loading={loading} icon="save" />
      <Button label="Cancelar" onPress={onCancel} variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  moduleTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minWidth: '47%',
  },
  typeLabel: { fontSize: 14, fontWeight: '600' },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 48,
  },
  timeButtonText: { fontSize: 16, fontWeight: '600' },
  endPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  endPreviewText: { flex: 1 },
  endPreviewLabel: { fontSize: 12, fontWeight: '600' },
  endPreviewValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
});
