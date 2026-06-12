import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MedicationForm } from '@/components/medication-form';
import { useMedications } from '@/contexts/medications-context';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function NewMedicationScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { addMedication } = useMedications();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MedicationForm
        submitLabel="Cadastrar medicamento"
        onSubmit={async (data) => {
          await addMedication(data);
          router.back();
        }}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
