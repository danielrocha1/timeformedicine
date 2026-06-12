import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/empty-state';
import { MedicationListItem } from '@/components/medication-list-item';
import { Spacing } from '@/constants/theme';
import { useMedications } from '@/contexts/medications-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';

export default function MedicationsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const {
    medications,
    loading,
    pauseMedication,
    resumeMedication,
    finalizeTreatment,
    deleteMedication,
  } = useMedications();

  const sorted = [...medications].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Meus medicamentos</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {sorted.length} cadastrado{sorted.length !== 1 ? 's' : ''}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="Nenhum medicamento"
          description="Adicione seu primeiro medicamento para começar o acompanhamento."
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 80, paddingHorizontal: Spacing.md }}
          renderItem={({ item }) => (
            <MedicationListItem
              medication={item}
              onPress={() => router.push(`/medication/${item.id}`)}
              onPause={() => void pauseMedication(item.id)}
              onResume={() => void resumeMedication(item.id)}
              onFinalize={() => void finalizeTreatment(item.id)}
              onDelete={() => void deleteMedication(item.id)}
            />
          )}
        />
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
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
