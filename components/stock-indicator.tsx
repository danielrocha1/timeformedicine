import { StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing } from '@/constants/theme';
import { formatAmountPerDose, getAmountUnitLabel } from '@/lib/medication-utils';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { MedicationType } from '@/types';

interface StockIndicatorProps {
  stockTotal: number;
  pillsPerDose: number;
  remainingDoses: number;
  isLowStock: boolean;
  medicationType?: MedicationType;
  compact?: boolean;
}

export function StockIndicator({
  stockTotal,
  pillsPerDose,
  remainingDoses,
  isLowStock,
  medicationType = 'tablet',
  compact,
}: StockIndicatorProps) {
  const colors = useThemeColors();
  const unit = getAmountUnitLabel(medicationType, stockTotal);
  const fillPercent = Math.min(100, (remainingDoses / Math.max(remainingDoses, 10)) * 100);
  const barColor =
    stockTotal <= 0 ? colors.stockEmpty : isLowStock ? colors.stockLow : colors.stockHigh;

  return (
    <View style={compact ? styles.compact : undefined}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {stockTotal} {unit} · {remainingDoses} dose{remainingDoses !== 1 ? 's' : ''}
        </Text>
        {isLowStock && stockTotal > 0 && (
          <Text style={[styles.badge, { color: colors.warning, backgroundColor: `${colors.warning}22` }]}>
            Estoque baixo
          </Text>
        )}
        {stockTotal <= 0 && (
          <Text style={[styles.badge, { color: colors.danger, backgroundColor: `${colors.danger}22` }]}>
            Sem estoque
          </Text>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: `${stockTotal <= 0 ? 0 : Math.max(fillPercent, 8)}%`,
            },
          ]}
        />
      </View>
      {!compact && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {formatAmountPerDose(pillsPerDose, medicationType)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: { fontSize: 13, fontWeight: '500' },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  track: { height: 6, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: BorderRadius.full },
  hint: { fontSize: 12, marginTop: Spacing.xs },
});
