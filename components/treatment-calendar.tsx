import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { formatScheduledTimeOnly } from '@/components/dose-history-item';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  DOSE_STATUS_LABELS,
  getCalendarDayEmoji,
  type TreatmentCalendarDay,
} from '@/lib/adherence-engine';

interface TreatmentCalendarProps {
  days: TreatmentCalendarDay[];
}

export function TreatmentCalendar({ days }: TreatmentCalendarProps) {
  const colors = useThemeColors();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const visibleDays = [...days].reverse();

  return (
    <View style={styles.container}>
      {visibleDays.map((day) => {
        const isExpanded = expandedDate === day.date;
        const hasDoses = day.doses.length > 0;

        return (
          <Pressable
            key={day.date}
            onPress={() => hasDoses && setExpandedDate(isExpanded ? null : day.date)}
            disabled={!hasDoses}
          >
            <Card style={day.status === 'empty' ? styles.emptyDay : undefined}>
              <View style={styles.dayRow}>
                <View style={[styles.dateBox, { backgroundColor: `${colors.primary}12` }]}>
                  <Text style={[styles.dayNumber, { color: colors.primary }]}>{day.dayNumber}</Text>
                  <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
                    {day.monthLabel}
                  </Text>
                </View>
                <View style={styles.dayInfo}>
                  <Text style={[styles.weekday, { color: colors.textSecondary }]}>
                    {day.weekdayLabel}
                  </Text>
                  {hasDoses ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.emoji}>{getCalendarDayEmoji(day.status)}</Text>
                      <Text style={[styles.summary, { color: colors.text }]}>{day.summary}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.noData, { color: colors.textSecondary }]}>
                      Sem doses programadas
                    </Text>
                  )}
                </View>
              </View>

              {isExpanded && hasDoses && (
                <View style={[styles.doseList, { borderTopColor: colors.border }]}>
                  {day.doses.map((dose) => (
                    <View key={dose.id} style={styles.doseRow}>
                      <Text style={[styles.doseTime, { color: colors.textSecondary }]}>
                        {formatScheduledTimeOnly(dose.scheduledFor)}
                      </Text>
                      <Text style={[styles.doseName, { color: colors.text }]} numberOfLines={1}>
                        {dose.medicationName}
                      </Text>
                      <Text style={[styles.doseStatus, { color: colors.textSecondary }]}>
                        {DOSE_STATUS_LABELS[dose.status]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  emptyDay: { opacity: 0.7 },
  dayRow: { flexDirection: 'row', alignItems: 'center' },
  dateBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dayNumber: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  monthLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  dayInfo: { flex: 1 },
  weekday: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  emoji: { fontSize: 16 },
  summary: { fontSize: 15, fontWeight: '600', flex: 1 },
  noData: { fontSize: 14 },
  doseList: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1 },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  doseTime: { fontSize: 12, fontWeight: '600', width: 48 },
  doseName: { flex: 1, fontSize: 13, fontWeight: '600' },
  doseStatus: { fontSize: 11, fontWeight: '500' },
});
