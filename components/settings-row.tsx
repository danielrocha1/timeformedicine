import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  danger?: boolean;
}

export function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  onPress,
  switchValue,
  onSwitchChange,
  danger,
}: SettingsRowProps) {
  const colors = useThemeColors();
  const isSwitch = onSwitchChange != null;

  const content = (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: `${danger ? colors.danger : colors.primary}18` }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {isSwitch ? (
        <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ true: colors.primary }} />
      ) : value ? (
        <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : null}
    </View>
  );

  if (onPress && !isSwitch) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textCol: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2 },
  value: { fontSize: 14, fontWeight: '500' },
});
