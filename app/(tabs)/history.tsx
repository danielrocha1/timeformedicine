import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/ui/card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useMedications } from '@/contexts/medications-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { formatDateTime } from '@/lib/medication-utils';

export default function HistoryScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { doseHistory, loading } = useMedications();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Histórico de doses</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Registro das doses que você tomou</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : doseHistory.length === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title="Nenhuma dose registrada"
          description="Quando você marcar 'Tomei' na tela inicial, o histórico aparecerá aqui."
        />
      ) : (
        <FlatList
          data={doseHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.md }]}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: `${colors.secondary}22` }]}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.secondary} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.medicationName}</Text>
                  <Text style={[styles.dosage, { color: colors.textSecondary }]}>{item.dosage}</Text>
                  <Text style={[styles.time, { color: colors.textSecondary }]}>
                    {formatDateTime(new Date(item.takenAt))}
                  </Text>
                </View>
                <Text style={[styles.pills, { color: colors.primary }]}>-{item.pillsConsumed}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  list: { paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  dosage: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 12, marginTop: 4 },
  pills: { fontSize: 16, fontWeight: '700' },
});
