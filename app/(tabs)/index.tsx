import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { MedicationCard } from '@/components/medication-card';
import { Spacing } from '@/constants/theme';
import { useMedications } from '@/contexts/medications-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { buildUpcomingDoses } from '@/lib/medication-utils';

export default function DashboardScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const { medications, loading, takeDose } = useMedications();
  const upcoming = buildUpcomingDoses(medications);
  const lowStockCount = upcoming.filter((u) => u.isLowStock).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Time for Medicine</Text>
          <Text style={[styles.title, { color: colors.text }]}>Seus lembretes</Text>
        </View>
        {lowStockCount > 0 && (
          <View style={[styles.alertPill, { backgroundColor: `${colors.warning}22` }]}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning }]}>{lowStockCount} com estoque baixo</Text>
          </View>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="Nenhum medicamento cadastrado ainda"
          description="Toque no botão + para adicionar seu primeiro remédio e receber lembretes no horário certo."
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {upcoming.map((item) => (
            <MedicationCard key={item.medication.id} item={item} onTakeDose={takeDose} />
          ))}
        </ScrollView>
      )}
      <Pressable
        onPress={() => router.push('/medication/new')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, bottom: tabBarHeight + Spacing.md, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  alertPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: 20 },
  alertText: { fontSize: 12, fontWeight: '600' },
  loader: { marginTop: Spacing.xxl },
  list: { paddingHorizontal: Spacing.md },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
