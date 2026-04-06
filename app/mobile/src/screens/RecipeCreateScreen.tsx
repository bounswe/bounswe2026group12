import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IngredientPicker } from '../components/pickers/IngredientPicker';
import { UnitPicker } from '../components/pickers/UnitPicker';
import type { RootStackParamList } from '../navigation/types';
import type { CatalogSelection } from '../types/catalog';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeCreate'>;

const emptySelection: CatalogSelection = { id: null, name: '' };

export default function RecipeCreateScreen(_props: Props) {
  const [ingredient, setIngredient] = useState<CatalogSelection>(emptySelection);
  const [unit, setUnit] = useState<CatalogSelection>(emptySelection);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading} accessibilityRole="header">
          New recipe
        </Text>
        <Text style={styles.lead}>
          Placeholder for recipe creation. Ingredient and unit pickers use the same API
          paths as the web app when a backend is available; otherwise mock data is used.
        </Text>

        <IngredientPicker value={ingredient} onValueChange={setIngredient} />
        <UnitPicker value={unit} onValueChange={setUnit} />

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Selection preview</Text>
          <Text style={styles.summaryLine}>
            Ingredient:{' '}
            {ingredient.name.trim()
              ? `${ingredient.name}${ingredient.id != null ? ` (id ${ingredient.id})` : ''}`
              : '—'}
          </Text>
          <Text style={styles.summaryLine}>
            Unit:{' '}
            {unit.name.trim()
              ? `${unit.name}${unit.id != null ? ` (id ${unit.id})` : ''}`
              : '—'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 32 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  lead: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 22,
  },
  summary: {
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  summaryLine: { fontSize: 15, color: '#334155', marginBottom: 4 },
});
