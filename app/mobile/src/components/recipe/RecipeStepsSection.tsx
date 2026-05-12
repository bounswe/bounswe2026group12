import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';

/**
 * Read-only numbered list of cooking steps for the recipe detail screen
 * (#806). Backend `Recipe.steps` is a JSONField of plain strings. The whole
 * section hides itself when the array is empty / null / undefined — we never
 * render a "No steps yet" placeholder, mirroring how the description block
 * stays silent when the field is missing.
 */
export function RecipeStepsSection({ steps }: { steps: string[] }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  return (
    <View style={styles.wrap} accessibilityLabel="Recipe steps">
      <Text style={styles.heading} accessibilityRole="header">
        Steps
      </Text>
      <View style={styles.list}>
        {steps.map((step, idx) => (
          <View key={`step-${idx}`} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{idx + 1}</Text>
            </View>
            <Text style={styles.body}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.surfaceDark,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  body: {
    flex: 1,
    fontSize: 16,
    color: tokens.colors.text,
    lineHeight: 22,
  },
});
