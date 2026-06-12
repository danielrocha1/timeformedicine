import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  formatDailySchedule,
  generateDailyTimesFromInterval,
  sortTimeStrings,
  validateCustomTimes,
} from '@/lib/schedule-engine';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { FREQUENCY_PRESET_OPTIONS, type FrequencyMode, type FrequencyPreset } from '@/types';

export interface FrequencyScheduleValue {
  frequencyMode: FrequencyMode;
  frequencyPreset: FrequencyPreset;
  intervalHours: number;
  firstDoseTime: string;
  customTimes: string[];
}

interface FrequencySchedulePickerProps {
  value: FrequencyScheduleValue;
  onChange: (value: FrequencyScheduleValue) => void;
  intervalError?: string;
  timesError?: string;
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

export function FrequencySchedulePicker({
  value,
  onChange,
  intervalError,
  timesError,
}: FrequencySchedulePickerProps) {
  const colors = useThemeColors();
  const [showAnchorPicker, setShowAnchorPicker] = useState(false);
  const [showAddTimePicker, setShowAddTimePicker] = useState(false);
  const [customInterval, setCustomInterval] = useState(
    value.frequencyPreset === 'custom' && value.frequencyMode === 'interval'
      ? String(value.intervalHours)
      : '',
  );

  const dailyPreview = useMemo(() => {
    if (value.frequencyMode === 'fixed_times') {
      return sortTimeStrings(value.customTimes);
    }
    return generateDailyTimesFromInterval(value.firstDoseTime, value.intervalHours);
  }, [value]);

  const selectPreset = (preset: FrequencyPreset) => {
    const option = FREQUENCY_PRESET_OPTIONS.find((o) => o.value === preset);
    if (preset === 'custom') {
      onChange({
        ...value,
        frequencyPreset: 'custom',
        frequencyMode: value.frequencyMode === 'fixed_times' ? 'fixed_times' : 'interval',
      });
      return;
    }

    onChange({
      ...value,
      frequencyPreset: preset,
      frequencyMode: 'interval',
      intervalHours: option?.intervalHours ?? value.intervalHours,
      customTimes: [],
    });
    setCustomInterval('');
  };

  const addCustomTime = (time: string) => {
    if (value.customTimes.includes(time)) return;
    onChange({
      ...value,
      frequencyMode: 'fixed_times',
      frequencyPreset: 'custom',
      customTimes: sortTimeStrings([...value.customTimes, time]),
    });
  };

  const removeCustomTime = (time: string) => {
    onChange({
      ...value,
      customTimes: value.customTimes.filter((t) => t !== time),
    });
  };

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Frequência da medicação</Text>
      <View style={styles.presetColumn}>
        {FREQUENCY_PRESET_OPTIONS.map((option) => {
          const selected = value.frequencyPreset === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => selectPreset(option.value)}
              style={[
                styles.presetRow,
                {
                  backgroundColor: selected ? `${colors.primary}15` : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                {selected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.presetLabel, { color: colors.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {value.frequencyPreset === 'custom' && (
        <View style={styles.customBlock}>
          <View style={styles.customModeRow}>
            <Pressable
              onPress={() =>
                onChange({ ...value, frequencyMode: 'interval', customTimes: [] })
              }
              style={[
                styles.customModeChip,
                {
                  backgroundColor:
                    value.frequencyMode === 'interval' ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: value.frequencyMode === 'interval' ? '#FFF' : colors.text,
                  fontWeight: '600',
                }}
              >
                Por intervalo
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                onChange({
                  ...value,
                  frequencyMode: 'fixed_times',
                  customTimes:
                    value.customTimes.length > 0
                      ? value.customTimes
                      : [value.firstDoseTime],
                })
              }
              style={[
                styles.customModeChip,
                {
                  backgroundColor:
                    value.frequencyMode === 'fixed_times' ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: value.frequencyMode === 'fixed_times' ? '#FFF' : colors.text,
                  fontWeight: '600',
                }}
              >
                Horários fixos
              </Text>
            </Pressable>
          </View>

          {value.frequencyMode === 'interval' ? (
            <Input
              label="Intervalo personalizado (horas)"
              placeholder="Ex: 6, 10, 18..."
              keyboardType="number-pad"
              value={customInterval}
              onChangeText={(text) => {
                setCustomInterval(text);
                const hours = Number(text);
                if (hours >= 1 && hours <= 72) {
                  onChange({ ...value, intervalHours: hours });
                }
              }}
              error={intervalError}
            />
          ) : (
            <View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Horários do dia
              </Text>
              <View style={styles.timesRow}>
                {value.customTimes.map((time) => (
                  <Pressable
                    key={time}
                    onPress={() => removeCustomTime(time)}
                    style={[styles.timeChip, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.timeChipText, { color: colors.primary }]}>{time}</Text>
                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
              <Button
                label="Adicionar horário"
                icon="add-circle-outline"
                variant="outline"
                onPress={() => setShowAddTimePicker(true)}
              />
              {showAddTimePicker && (
                <DateTimePicker
                  value={parseTimeToDate(value.firstDoseTime)}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (Platform.OS === 'android') setShowAddTimePicker(false);
                    if (date) addCustomTime(formatDateToTime(date));
                  }}
                />
              )}
              {Platform.OS === 'ios' && showAddTimePicker && (
                <Button label="Fechar" variant="ghost" onPress={() => setShowAddTimePicker(false)} />
              )}
              {timesError && <Text style={[styles.errorText, { color: colors.danger }]}>{timesError}</Text>}
              {!timesError && validateCustomTimes(value.customTimes) && (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {validateCustomTimes(value.customTimes)}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {value.frequencyMode === 'interval' && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Horário da primeira dose
          </Text>
          <Pressable
            onPress={() => setShowAnchorPicker(true)}
            style={[styles.timeButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.timeButtonText, { color: colors.text }]}>{value.firstDoseTime}</Text>
          </Pressable>
          {showAnchorPicker && (
            <DateTimePicker
              value={parseTimeToDate(value.firstDoseTime)}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowAnchorPicker(false);
                if (date) onChange({ ...value, firstDoseTime: formatDateToTime(date) });
              }}
            />
          )}
          {Platform.OS === 'ios' && showAnchorPicker && (
            <Button label="Confirmar horário" variant="outline" onPress={() => setShowAnchorPicker(false)} />
          )}
        </>
      )}

      {dailyPreview.length > 0 && (
        <View style={[styles.previewBox, { backgroundColor: `${colors.secondary}12`, borderColor: colors.secondary }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.secondary} />
          <View style={styles.previewContent}>
            <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>
              Horários gerados automaticamente
            </Text>
            <Text style={[styles.previewTimes, { color: colors.text }]}>
              {formatDailySchedule(dailyPreview)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.sm },
  presetColumn: { gap: Spacing.sm, marginBottom: Spacing.md },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  presetLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  customBlock: { marginBottom: Spacing.md },
  customModeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  customModeChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  timeChipText: { fontSize: 14, fontWeight: '700' },
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
  previewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  previewContent: { flex: 1 },
  previewTitle: { fontSize: 12, fontWeight: '600' },
  previewTimes: { fontSize: 18, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
  errorText: { fontSize: 13, marginTop: Spacing.xs },
});
