import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AdherenceReport } from '@/lib/adherence-engine';

interface AdherenceReportCardProps {
  report: AdherenceReport;
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          { color: highlight ? colors.primary : colors.text },
          highlight && styles.statHighlight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function AdherenceReportCard({ report }: AdherenceReportCardProps) {
  const colors = useThemeColors();

  const adherenceColor =
    report.adherencePercent >= 90
      ? colors.success
      : report.adherencePercent >= 70
        ? colors.warning
        : colors.danger;

  return (
    <View style={styles.container}>
      <Card highlighted>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Relatório de Adesão</Text>

        <View style={[styles.heroBox, { backgroundColor: `${adherenceColor}15` }]}>
          <Text style={[styles.heroPercent, { color: adherenceColor }]}>
            {report.adherencePercent}%
          </Text>
          <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>de adesão</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatRow label="Tratamento" value={`${report.treatmentDays} dias`} />
          <StatRow label="Doses previstas" value={report.expectedDoses} />
          <StatRow label="Tomadas" value={report.takenDoses} highlight />
          <StatRow label="No horário" value={report.onTimeDoses} />
          <StatRow label="Atrasadas" value={report.lateDoses} />
          <StatRow label="Esquecidas" value={report.missedDoses} />
          {report.pendingDoses > 0 && (
            <StatRow label="Pendentes" value={report.pendingDoses} />
          )}
        </View>
      </Card>

      {report.breakdown.length > 0 && (
        <>
          <Text style={[styles.breakdownTitle, { color: colors.text }]}>Por medicamento</Text>
          {report.breakdown.map((item) => (
            <Card key={item.medicationId}>
              <View style={styles.medRow}>
                <View style={styles.medInfo}>
                  <Text style={[styles.medName, { color: colors.text }]}>{item.medicationName}</Text>
                  <Text style={[styles.medStats, { color: colors.textSecondary }]}>
                    {item.takenDoses}/{item.expectedDoses} tomadas · {item.missedDoses} esquecidas
                  </Text>
                </View>
                <View
                  style={[
                    styles.medPercent,
                    {
                      backgroundColor:
                        item.adherencePercent >= 90
                          ? `${colors.success}22`
                          : item.adherencePercent >= 70
                            ? `${colors.warning}22`
                            : `${colors.danger}22`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.medPercentText,
                      {
                        color:
                          item.adherencePercent >= 90
                            ? colors.success
                            : item.adherencePercent >= 70
                              ? colors.warning
                              : colors.danger,
                      },
                    ]}
                  >
                    {item.adherencePercent}%
                  </Text>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${item.adherencePercent}%`,
                      backgroundColor:
                        item.adherencePercent >= 90
                          ? colors.success
                          : item.adherencePercent >= 70
                            ? colors.warning
                            : colors.danger,
                    },
                  ]}
                />
              </View>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.md },
  heroBox: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  heroPercent: { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  heroLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  statsGrid: { gap: Spacing.sm },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: { fontSize: 14, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statHighlight: { fontSize: 18 },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  medRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: '700' },
  medStats: { fontSize: 12, marginTop: 2 },
  medPercent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  medPercentText: { fontSize: 16, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
