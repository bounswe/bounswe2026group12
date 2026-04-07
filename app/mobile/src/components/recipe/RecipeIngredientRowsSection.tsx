import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { IngredientPicker } from '../pickers/IngredientPicker';
import { UnitPicker } from '../pickers/UnitPicker';
import type { AuthoringIngredientRow } from './recipeFormState';
import { InlineFieldError } from './InlineFieldError';
import { recipeFormStyles as styles } from './recipeFormStyles';

type RowErrors = { amount?: string; ingredient?: string; unit?: string };

type Props = {
  rows: AuthoringIngredientRow[];
  onAddRow: () => void;
  onRemoveRow: (key: string) => void;
  onUpdateRow: (key: string, patch: Partial<AuthoringIngredientRow>) => void;
  attemptedSubmit: boolean;
  rowsTopError?: string;
  rowErrors?: Record<string, RowErrors>;
};

export function RecipeIngredientRowsSection({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  attemptedSubmit,
  rowsTopError,
  rowErrors,
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ingredients</Text>
      {attemptedSubmit ? <InlineFieldError message={rowsTopError} /> : null}

      {rows.map((row, idx) => {
        const re = rowErrors?.[row.key];
        return (
          <View key={row.key} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>Ingredient {idx + 1}</Text>
              {rows.length > 1 ? (
                <Pressable
                  onPress={() => onRemoveRow(row.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ingredient ${idx + 1}`}
                  hitSlop={8}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              value={row.amount}
              onChangeText={(t) => onUpdateRow(row.key, { amount: t })}
              placeholder="e.g. 2"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              style={[styles.input, attemptedSubmit && !!re?.amount && styles.inputError]}
              accessibilityLabel={`Amount for ingredient ${idx + 1}`}
            />
            {attemptedSubmit ? <InlineFieldError message={re?.amount} /> : null}

            <IngredientPicker
              value={row.ingredient}
              onValueChange={(next) => onUpdateRow(row.key, { ingredient: next })}
            />
            {attemptedSubmit ? <InlineFieldError message={re?.ingredient} /> : null}

            <UnitPicker
              value={row.unit}
              onValueChange={(next) => onUpdateRow(row.key, { unit: next })}
            />
            {attemptedSubmit ? <InlineFieldError message={re?.unit} /> : null}
          </View>
        );
      })}

      <Pressable
        onPress={onAddRow}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Add ingredient"
      >
        <Text style={styles.secondaryButtonText}>Add ingredient</Text>
      </Pressable>
    </View>
  );
}
