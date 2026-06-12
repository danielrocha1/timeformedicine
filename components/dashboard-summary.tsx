import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatTime } from '@/lib/medication-utils';
import type { DoseHistoryEntry, UpcomingDose } from '@/types';

interface DashboardSummaryProps {
  nextDose?: UpcomingDose;
  lastDose?: DoseHistoryEntry;
  adherencePercent: number;
  userName?: string;
}

export function DashboardSummary({ nextDose, lastDose, adherencePercent, userName }: DashboardSummaryProps) {
  const colors = useThemeColors();

  const statusLabel = nextDose?.hasMissedDoses ? 'Atrasado' : nextDose ? 'Aguardando' : 'Sem doses';
  const statusColor = nextDose?.hasMissedDoses ? colors.danger : colors.primary;

  return (
    <Card highlighted style={styles.card}>
      <Text style={[styles.greeting, { color: colors.textSecondary }]}>
        Olá{userName ? `, ${userName.split(' ')[0]}` : ''} 👋
      </Text>

      {nextDose ? (
        <View style={styles.nextBlock}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Próximo medicamento</Text>
          <View style={styles.nextRow}>
            <View style={[styles.medIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="medical" size={28} color={colors.primary} />
            </View>
            <View style={styles.nextInfo}>
              <Text style={[styles.medName, { color: colors.text }]}>{nextDose.medication.name}</Text>
              <Text style={[styles.medDose, { color: colors.textSecondary }]}>{nextDose.medication.dosage}</Text>
              <Text style={[styles.medTime, { color: colors.text }]}>
                Horário: {formatTime(nextDose.nextDoseAt)}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.stockHint, { color: colors.textSecondary }]}>
            Restante: {nextDose.remainingDoses} dose{nextDose.remainingDoses !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Nenhuma dose pendente hoje.</Text>
      )}

      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{adherencePercent}%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Adesão</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {lastDose ? formatTime(new Date(lastDose.takenAt ?? lastDose.recordedAt)) : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Última dose</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  greeting: { fontSize: 15, fontWeight: '600', marginBottom: Spacing.md },
  nextBlock: { marginBottom: Spacing.md },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: Spacing.sm },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start' },
  medIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  nextInfo: { flex: 1 },
  medName: { fontSize: 22, fontWeight: '800' },
  medDose: { fontSize: 14, marginTop: 2 },
  medTime: { fontSize: 16, fontWeight: '600', marginTop: Spacing.sm },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  stockHint: { fontSize: 13, marginTop: Spacing.sm },
  empty: { fontSize: 15, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: Spacing.md, gap: Spacing.lg },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2, fontWeight: '600' },
});
