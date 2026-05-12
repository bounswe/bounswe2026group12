import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '../../theme';
import { recipeFormStyles } from './recipeFormStyles';

export type RecipeStepsRepeaterProps = {
  steps: string[];
  onChange: (steps: string[]) => void;
};

/**
 * Trim every step and drop rows that are blank after trimming. Used by the
 * Create/Edit submit handlers to build the final payload for backend
 * `Recipe.steps` (a JSONField of strings, #806). Exported so tests can
 * exercise the helper without mounting the component.
 */
export function trimStepsForPayload(steps: string[]): string[] {
  return steps.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Controlled repeater for editing the ordered `steps` array (#806). Pure —
 * no side effects, all state lives in the parent. Adding, removing, and
 * reordering happen through `onChange` so Create and Edit can share the same
 * component while keeping their own submit pipelines.
 *
 * An empty list is valid; submit handlers send `steps: []` rather than
 * forcing one mandatory row.
 */
export function RecipeStepsRepeater({ steps, onChange }: RecipeStepsRepeaterProps) {
  function updateAt(index: number, value: string) {
    const next = steps.slice();
    next[index] = value;
    onChange(next);
  }

  function addStep() {
    onChange([...steps, '']);
  }

  function removeAt(index: number) {
    const next = steps.slice();
    next.splice(index, 1);
    onChange(next);
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = steps.slice();
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index >= steps.length - 1) return;
    const next = steps.slice();
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    onChange(next);
  }

  return (
    <View style={recipeFormStyles.section} accessibilityLabel="Recipe steps">
      <Text style={recipeFormStyles.sectionTitle}>Steps</Text>
      {steps.length === 0 ? (
        <Text style={styles.emptyHint}>
          No steps yet. Tap “Add step” to add the first one — leaving this empty is fine too.
        </Text>
      ) : null}
      {steps.map((step, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === steps.length - 1;
        return (
          <View key={`step-row-${idx}`} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>Step {idx + 1}</Text>
              <View style={styles.controls}>
                <Pressable
                  onPress={() => moveUp(idx)}
                  disabled={isFirst}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    isFirst && styles.iconBtnDisabled,
                    pressed && !isFirst && styles.iconBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Move step ${idx + 1} up`}
                  accessibilityState={{ disabled: isFirst }}
                  hitSlop={6}
                >
                  <Text style={[styles.iconText, isFirst && styles.iconTextDisabled]}>▲</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveDown(idx)}
                  disabled={isLast}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    isLast && styles.iconBtnDisabled,
                    pressed && !isLast && styles.iconBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Move step ${idx + 1} down`}
                  accessibilityState={{ disabled: isLast }}
                  hitSlop={6}
                >
                  <Text style={[styles.iconText, isLast && styles.iconTextDisabled]}>▼</Text>
                </Pressable>
                <Pressable
                  onPress={() => removeAt(idx)}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove step ${idx + 1}`}
                  hitSlop={6}
                >
                  <Text style={styles.iconTextRemove}>✕</Text>
                </Pressable>
              </View>
            </View>
            <TextInput
              value={step}
              onChangeText={(t) => updateAt(idx, t)}
              placeholder={`Describe step ${idx + 1}…`}
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
              numberOfLines={3}
              accessibilityLabel={`Step ${idx + 1} description`}
            />
          </View>
        );
      })}
      <Pressable
        onPress={addStep}
        style={({ pressed }) => [styles.addBtn, pressed && recipeFormStyles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Add step"
      >
        <Text style={styles.addBtnText}>+ Add step</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyHint: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: 12,
    backgroundColor: tokens.colors.surface,
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.surface,
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  iconBtnPressed: {
    opacity: 0.7,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  iconTextDisabled: {
    color: tokens.colors.textMuted,
  },
  iconTextRemove: {
    fontSize: 14,
    fontWeight: '800',
    color: tokens.colors.error,
  },
  input: {
    borderWidth: 2,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: tokens.colors.surfaceInput,
    minHeight: 88,
    textAlignVertical: 'top',
    color: tokens.colors.text,
  },
  addBtn: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'transparent',
  },
  addBtnText: {
    color: tokens.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
