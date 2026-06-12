import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StockIndicator } from '@/components/stock-indicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatDate, formatTime, getDailyScheduleTimes, getMedicationTypeLabel, getRelativeDoseLabel } from '@/lib/medication-utils';
import { formatDailySchedule } from '@/lib/schedule-engine';
import type { UpcomingDose } from '@/types';

interface MedicationCardProps {
  item: UpcomingDose;
  onTakeDose: (id: string) => void;
  onForgotDose: (id: string) => void;
}

export function MedicationCard({ item, onTakeDose, onForgotDose }: MedicationCardProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const { medication, nextDoseAt, isNext, remainingDoses, isLowStock, hasMissedDoses } = item;
  const isOverdue =
    hasMissedDoses || nextDoseAt.getTime() < Date.now() - 5 * 60 * 1000;

  return (
    <Card highlighted={isNext}>
      <Pressable onPress={() => router.push(`/medication/${medication.id}`)}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="medical" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: colors.text }]}>{medication.name}</Text>
            <Text style={[styles.dosage, { color: colors.textSecondary }]}>
              {medication.dosage} · {getMedicationTypeLabel(medication.medicationType)}
            </Text>
          </View>
          {hasMissedDoses && (
            <View style={[styles.nextBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.nextBadgeText}>Esquecida</Text>
            </View>
          )}
          {isNext && !hasMissedDoses && (
            <View style={[styles.nextBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.nextBadgeText}>Próxima</Text>
            </View>
          )}
        </View>
        <View style={[styles.timeRow, { backgroundColor: `${colors.primary}10` }]}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <View style={styles.timeCol}>
            <Text style={[styles.timeText, { color: colors.text }]}>
              {formatTime(nextDoseAt)} · {getRelativeDoseLabel(nextDoseAt)}
            </Text>
            <Text style={[styles.scheduleHint, { color: colors.textSecondary }]}>
              {formatDailySchedule(getDailyScheduleTimes(medication))}
            </Text>
          </View>
          {isOverdue && <Text style={[styles.overdue, { color: colors.danger }]}>!</Text>}
        </View>
        <StockIndicator
          stockTotal={medication.stockTotal}
          pillsPerDose={medication.pillsPerDose}
          remainingDoses={remainingDoses}
          isLowStock={isLowStock}
          medicationType={medication.medicationType}
        />
        {medication.expectedEndDate && (
          <Text style={[styles.stockEstimate, { color: colors.textSecondary }]}>
            Término previsto: {formatDate(new Date(medication.expectedEndDate))}
          </Text>
        )}
        {medication.notes ? (
          <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>
            {medication.notes}
          </Text>
        ) : null}
      </Pressable>
      <View style={styles.actions}>
        <Button
          label={hasMissedDoses ? 'Tomei agora (atrasada)' : 'Tomei'}
          icon="checkmark-circle"
          onPress={() => onTakeDose(medication.id)}
          disabled={medication.stockTotal < medication.pillsPerDose}
          style={styles.actionBtn}
        />
        <Button
          label="Esqueci"
          icon="close-circle-outline"
          onPress={() => onForgotDose(medication.id)}
          variant="outline"
          style={styles.actionBtn}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700' },
  dosage: { fontSize: 14, marginTop: 2 },
  nextBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  nextBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  timeText: { fontSize: 15, fontWeight: '600' },
  timeCol: { flex: 1 },
  scheduleHint: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  overdue: { fontSize: 18, fontWeight: '800' },
  stockEstimate: { fontSize: 12, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  notes: { fontSize: 13, fontStyle: 'italic', marginBottom: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1 },
});
