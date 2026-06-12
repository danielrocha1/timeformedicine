import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdherenceReportCard } from '@/components/adherence-report-card';
import { DoseHistoryItem } from '@/components/dose-history-item';
import { EmptyState } from '@/components/empty-state';
import { TreatmentCalendar } from '@/components/treatment-calendar';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useMedications } from '@/contexts/medications-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';

type HistoryTab = 'history' | 'calendar' | 'adherence';

const TABS: { id: HistoryTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'history', label: 'Histórico', icon: 'list' },
  { id: 'calendar', label: 'Calendário', icon: 'calendar' },
  { id: 'adherence', label: 'Adesão', icon: 'stats-chart' },
];

export default function HistoryScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { unifiedHistory, treatmentCalendar, adherenceReport, loading, medications } =
    useMedications();
  const [activeTab, setActiveTab] = useState<HistoryTab>('history');

  const hasData = medications.length > 0 || unifiedHistory.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Histórico e Tratamento</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Acompanhe doses, calendário e adesão
        </Text>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                active && { backgroundColor: `${colors.primary}18` },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.textSecondary },
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : !hasData ? (
        <EmptyState
          icon="clipboard-outline"
          title="Nenhum registro ainda"
          description="Cadastre medicamentos e marque doses para ver o histórico completo, calendário e relatório de adesão."
        />
      ) : activeTab === 'history' ? (
        unifiedHistory.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="Nenhuma dose registrada"
            description="Quando você marcar 'Tomei' ou interagir com os alarmes, o histórico aparecerá aqui."
          />
        ) : (
          <FlatList
            data={unifiedHistory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.md }]}
            renderItem={({ item }) => <DoseHistoryItem entry={item} />}
          />
        )
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.md }]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'calendar' && <TreatmentCalendar days={treatmentCalendar} />}
          {activeTab === 'adherence' && <AdherenceReportCard report={adherenceReport} />}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabLabelActive: { fontWeight: '800' },
  loader: { marginTop: Spacing.xxl },
  list: { paddingHorizontal: Spacing.md },
});
