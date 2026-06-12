import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  DOSE_STATUS_LABELS,
  formatDelayLabel,
  getStatusColorKey,
} from '@/lib/adherence-engine';
import { formatTime } from '@/lib/medication-utils';
import type { DoseHistoryEntry } from '@/types';

interface DoseHistoryItemProps {
  entry: DoseHistoryEntry;
}

export function DoseHistoryItem({ entry }: DoseHistoryItemProps) {
  const colors = useThemeColors();
  const colorKey = getStatusColorKey(entry.status);
  const statusColor = colors[colorKey];

  const statusIcon =
    entry.status === 'on_time'
      ? 'checkmark-circle'
      : entry.status === 'late'
        ? 'time'
        : entry.status === 'missed'
          ? 'close-circle'
          : entry.status === 'pending'
            ? 'ellipse-outline'
            : 'ban';

  return (
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${statusColor}22` }]}>
          <Ionicons name={statusIcon} size={22} color={statusColor} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.text }]}>{entry.medicationName}</Text>
            <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {DOSE_STATUS_LABELS[entry.status]}
              </Text>
            </View>
          </View>
          <Text style={[styles.dosage, { color: colors.textSecondary }]}>{entry.dosage}</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]}>
              Programado: {formatTime(new Date(entry.scheduledFor))}
            </Text>
          </View>

          {entry.takenAt && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="checkmark-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.detail, { color: colors.textSecondary }]}>
                  {entry.status === 'late' ? 'Tomado' : 'Realizado'}:{' '}
                  {formatTime(new Date(entry.takenAt))}
                </Text>
              </View>
              {(entry.status === 'on_time' || entry.status === 'late') && (
                <View style={styles.detailRow}>
                  <Ionicons name="timer-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>
                    Atraso: {formatDelayLabel(entry.delayMinutes)}
                  </Text>
                </View>
              )}
            </>
          )}

          {entry.status === 'missed' && entry.confirmedAt && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detail, { color: colors.textSecondary }]}>
                Confirmado: {formatTime(new Date(entry.confirmedAt))}
              </Text>
            </View>
          )}

          {entry.notes ? (
            <View style={[styles.notesBox, { backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Observação</Text>
              <Text style={[styles.notes, { color: colors.text }]}>{entry.notes}</Text>
            </View>
          ) : null}
        </View>
        {entry.pillsConsumed != null && entry.pillsConsumed > 0 && (
          <Text style={[styles.pills, { color: colors.primary }]}>-{entry.pillsConsumed}</Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.xs },
  name: { fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dosage: { fontSize: 13, marginTop: 2, marginBottom: Spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detail: { fontSize: 12, flex: 1 },
  notesBox: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.sm },
  notesLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  notes: { fontSize: 13 },
  pills: { fontSize: 16, fontWeight: '700', marginLeft: Spacing.sm },
});

export function formatScheduledTimeOnly(iso: string): string {
  return formatTime(new Date(iso));
}
