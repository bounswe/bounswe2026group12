import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineFieldError } from '../components/recipe/InlineFieldError';
import { RecipeIngredientRowsSection } from '../components/recipe/RecipeIngredientRowsSection';
import { RecipeVideoSection } from '../components/recipe/RecipeVideoSection';
import {
  isPositiveNumberString,
  makeEmptyIngredientRow,
  type AuthoringIngredientRow,
} from '../components/recipe/recipeFormState';
import { recipeFormStyles as styles } from '../components/recipe/recipeFormStyles';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { mockSubmitRecipeCreate } from '../services/mockRecipeCreate';
import { tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeCreate'>;

export default function RecipeCreateScreen(_props: Props) {
  const { showToast } = useToast();
  const [description, setDescription] = useState('');
  const [qaEnabled, setQaEnabled] = useState(true);
  const [localVideo, setLocalVideo] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);
  const [rows, setRows] = useState<AuthoringIngredientRow[]>(() => {
    const r = makeEmptyIngredientRow();
    return [{ ...r, key: 'row-1' }];
  });

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const errors = useMemo(() => {
    const next: {
      description?: string;
      video?: string;
      rows?: Record<string, { amount?: string; ingredient?: string; unit?: string }>;
      rowsTop?: string;
    } = {};

    if (!description.trim()) next.description = 'Description is required.';
    if (!localVideo) next.video = 'Please select a video.';

    if (!rows.length) {
      next.rowsTop = 'Add at least one ingredient.';
    } else {
      const rowErrors: NonNullable<typeof next.rows> = {};
      for (const row of rows) {
        const re: { amount?: string; ingredient?: string; unit?: string } = {};
        if (!row.amount.trim()) re.amount = 'Amount is required.';
        else if (!isPositiveNumberString(row.amount.trim()))
          re.amount = 'Enter a positive number.';
        if (!row.ingredient.name.trim()) re.ingredient = 'Choose an ingredient.';
        if (!row.unit.name.trim()) re.unit = 'Choose a unit.';
        if (re.amount || re.ingredient || re.unit) rowErrors[row.key] = re;
      }
      if (Object.keys(rowErrors).length) next.rows = rowErrors;
    }

    return next;
  }, [description, rows, localVideo]);

  const isValid =
    !errors.description &&
    !errors.video &&
    !errors.rowsTop &&
    (!errors.rows || Object.keys(errors.rows).length === 0);

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Media library permission is needed to pick a video.', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setLocalVideo({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    });
  }

  function addRow() {
    setRows((prev) => [...prev, makeEmptyIngredientRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<AuthoringIngredientRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function submit() {
    setAttemptedSubmit(true);
    if (!isValid) return;

    const payload = {
      description: description.trim(),
      qa_enabled: qaEnabled,
      video: localVideo,
      ingredients: rows.map((r) => ({
        amount: Number(r.amount),
        ingredient: r.ingredient,
        unit: r.unit,
      })),
    };

    void (async () => {
      try {
        await mockSubmitRecipeCreate(payload);
        showToast('Recipe published!', 'success');
      } catch {
        showToast('Failed to publish recipe. Please try again.', 'error');
      }
    })();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.heading} accessibilityRole="header">
            Recipe upload
          </Text>
          <Text style={styles.lead}>
            Create a recipe with a description, ingredients, and a video. Ingredient and unit
            pickers use the same API paths as the web app when available; otherwise mock data
            is used.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Write a short description…"
              placeholderTextColor="#94a3b8"
              style={[
                styles.textArea,
                attemptedSubmit && !!errors.description && styles.inputError,
              ]}
              multiline
              accessibilityLabel="Recipe description"
            />
            {attemptedSubmit ? <InlineFieldError message={errors.description} /> : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <Switch
              value={qaEnabled}
              onValueChange={setQaEnabled}
              accessibilityLabel="Enable Q and A on this recipe"
            />
            <Text style={{ flex: 1, fontSize: 15, color: tokens.colors.textMuted, marginLeft: 12 }}>
              Enable Q&amp;A on this recipe
            </Text>
          </View>

          <RecipeIngredientRowsSection
            rows={rows}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onUpdateRow={updateRow}
            attemptedSubmit={attemptedSubmit}
            rowsTopError={errors.rowsTop}
            rowErrors={errors.rows}
          />

          <RecipeVideoSection
            onPickPress={() => void pickVideo()}
            localVideo={localVideo}
            onClearLocal={() => setLocalVideo(null)}
            requireSelection
            attemptedSubmit={attemptedSubmit}
            errorMessage={errors.video}
          />

          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Submit recipe"
          >
            <Text style={styles.primaryButtonText}>Submit (mock)</Text>
          </Pressable>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Selection preview</Text>
            <Text style={styles.summaryLine}>Ingredients: {rows.length}</Text>
            <Text style={styles.summaryLine}>
              Video: {localVideo ? 'selected' : '—'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
