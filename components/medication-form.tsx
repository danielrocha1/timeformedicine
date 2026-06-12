import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, QUICK_INTERVALS, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Medication, MedicationFormData } from '@/types';

interface MedicationFormProps {
  initial?: Medication;
  onSubmit: (data: MedicationFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function parseTimeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatDateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function MedicationForm({ initial, onSubmit, onCancel, submitLabel }: MedicationFormProps) {
  const colors = useThemeColors();
  const [name, setName] = useState(initial?.name ?? '');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [intervalHours, setIntervalHours] = useState(initial?.intervalHours ?? 8);
  const [customInterval, setCustomInterval] = useState('');
  const [firstDoseTime, setFirstDoseTime] = useState(initial?.firstDoseTime ?? '08:00');
  const [stockTotal, setStockTotal] = useState(String(initial?.stockTotal ?? ''));
  const [pillsPerDose, setPillsPerDose] = useState(String(initial?.pillsPerDose ?? '1'));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const effectiveInterval = customInterval.trim() ? Number(customInterval) : intervalHours;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Informe o nome';
    if (!dosage.trim()) next.dosage = 'Informe a dosagem';
    if (!effectiveInterval || effectiveInterval < 1 || effectiveInterval > 72) {
      next.interval = 'Intervalo entre 1 e 72 horas';
    }
    if (!stockTotal || Number(stockTotal) < 1) next.stock = 'Informe a quantidade em estoque';
    if (!pillsPerDose || Number(pillsPerDose) < 1) next.pills = 'Informe comprimidos por dose';
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
        intervalHours: effectiveInterval,
        firstDoseTime,
        stockTotal: Number(stockTotal),
        pillsPerDose: Number(pillsPerDose),
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
      <Input label="Nome do medicamento" placeholder="Ex: Paracetamol" value={name} onChangeText={setName} error={errors.name} />
      <Input label="Dosagem" placeholder="Ex: 500mg" value={dosage} onChangeText={setDosage} error={errors.dosage} />
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Intervalo entre doses</Text>
      <View style={styles.chipRow}>
        {QUICK_INTERVALS.map((h) => (
          <Pressable
            key={h}
            onPress={() => {
              setIntervalHours(h);
              setCustomInterval('');
            }}
            style={[
              styles.chip,
              {
                backgroundColor: effectiveInterval === h ? colors.primary : colors.card,
                borderColor: effectiveInterval === h ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ color: effectiveInterval === h ? '#FFF' : colors.text, fontWeight: '600' }}>{h}h</Text>
          </Pressable>
        ))}
      </View>
      <Input
        label="Intervalo personalizado (horas)"
        placeholder="Ex: 10"
        keyboardType="number-pad"
        value={customInterval}
        onChangeText={setCustomInterval}
        error={errors.interval}
      />
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Horário da primeira dose</Text>
      <Pressable
        onPress={() => setShowTimePicker(true)}
        style={[styles.timeButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
      >
        <Text style={[styles.timeButtonText, { color: colors.text }]}>{firstDoseTime}</Text>
      </Pressable>
      {showTimePicker && (
        <DateTimePicker
          value={parseTimeToDate(firstDoseTime)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            if (Platform.OS === 'android') setShowTimePicker(false);
            if (date) setFirstDoseTime(formatDateToTime(date));
          }}
        />
      )}
      {Platform.OS === 'ios' && showTimePicker && (
        <Button label="Confirmar horário" onPress={() => setShowTimePicker(false)} variant="outline" />
      )}
      <Input label="Quantidade em estoque" placeholder="Ex: 30" keyboardType="number-pad" value={stockTotal} onChangeText={setStockTotal} error={errors.stock} />
      <Input label="Comprimidos por dose" placeholder="Ex: 1" keyboardType="number-pad" value={pillsPerDose} onChangeText={setPillsPerDose} error={errors.pills} />
      <Input label="Observações (opcional)" placeholder="Ex: Tomar após as refeições" value={notes} onChangeText={setNotes} multiline numberOfLines={3} style={styles.notesInput} />
      <Button label={submitLabel} onPress={handleSubmit} loading={loading} icon="save" />
      <Button label="Cancelar" onPress={onCancel} variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  timeButton: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, minHeight: 48, justifyContent: 'center' },
  timeButtonText: { fontSize: 18, fontWeight: '600' },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
});
