import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { tokens } from '../../theme';
import { rankReasonLabel } from '../../utils/rankReason';

type Props = {
  reason: string | null | undefined;
  style?: StyleProp<ViewStyle>;
};

export function RankReasonBadge({ reason, style }: Props) {
  const label = rankReasonLabel(reason);
  if (!label) return null;
  return (
    <View style={[styles.pill, style]} accessibilityLabel={`Personalization: ${label}`}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.textOnDark,
    letterSpacing: 0.2,
  },
});
