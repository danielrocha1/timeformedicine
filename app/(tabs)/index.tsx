import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardSummary } from '@/components/dashboard-summary';
import { EmptyState } from '@/components/empty-state';
import { GroupedDoseBanner } from '@/components/intelligence-modals';
import { MedicationCard } from '@/components/medication-card';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { useMedications } from '@/contexts/medications-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { buildUpcomingDoses } from '@/lib/medication-utils';

export default function DashboardScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const { settings } = useSettings();
  const {
    medications,
    loading,
    takeDose,
    doseOccurrences,
    activeGroupedSlots,
    openGroupedDoseFlow,
    openForgotDoseFlow,
    unifiedHistory,
    adherenceReport,
  } = useMedications();
  const upcoming = buildUpcomingDoses(medications, doseOccurrences);
  const nextDose = upcoming.find((u) => u.isNext) ?? upcoming[0];
  const lastDose = unifiedHistory.find((h) => h.status === 'on_time' || h.status === 'late');
  const groupedBanner = activeGroupedSlots.find((g) => g.items.length > 1);
  const missedCount = upcoming.filter((u) => u.hasMissedDoses).length;
  const lowStockCount = upcoming.filter((u) => u.isLowStock).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Time for Medicine</Text>
          <Text style={[styles.title, { color: colors.text }]}>Seus lembretes</Text>
        </View>
        {missedCount > 0 && (
          <View style={[styles.alertPill, { backgroundColor: `${colors.danger}22` }]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.alertText, { color: colors.danger }]}>
              {missedCount} dose{missedCount !== 1 ? 's' : ''} esquecida{missedCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
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
          <DashboardSummary
            nextDose={nextDose}
            lastDose={lastDose}
            adherencePercent={adherenceReport.adherencePercent}
            userName={settings.profile.fullName}
          />
          {groupedBanner && (
            <GroupedDoseBanner
              group={groupedBanner}
              onPress={() => openGroupedDoseFlow(groupedBanner.slotKey)}
            />
          )}
          {upcoming.map((item) => (
            <MedicationCard
              key={item.medication.id}
              item={item}
              onTakeDose={takeDose}
              onForgotDose={openForgotDoseFlow}
            />
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
