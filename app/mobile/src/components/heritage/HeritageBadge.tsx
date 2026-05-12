import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';

type Props = {
  groupName: string;
  onPress: () => void;
};

/**
 * Reusable Heritage badge (#501). Appears on recipe/story detail screens
 * when the parent serializer surfaces a `heritage_group` object. Designed
 * as a small tappable card with a 🏛 glyph and the group name, sitting
 * below the "Similar / Linked" sections.
 */
export function HeritageBadge({ groupName, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`Open Heritage group ${groupName}`}
    >
      <View style={styles.glyphCircle}>
        <Text style={styles.glyph}>🏛</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>HERITAGE</Text>
        <Text style={styles.name} numberOfLines={2}>
          {groupName}
        </Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
  glyphCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 22 },
  body: { flex: 1, gap: 2 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: tokens.colors.textMuted,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  arrow: {
    fontSize: 18,
    fontWeight: '900',
    color: tokens.colors.surfaceDark,
  },
});
