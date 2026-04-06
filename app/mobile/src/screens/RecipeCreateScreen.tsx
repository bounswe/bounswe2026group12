import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IngredientPicker } from '../components/pickers/IngredientPicker';
import { UnitPicker } from '../components/pickers/UnitPicker';
import type { RootStackParamList } from '../navigation/types';
import type { CatalogSelection } from '../types/catalog';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeCreate'>;

const emptySelection: CatalogSelection = { id: null, name: '' };

type IngredientRow = {
  key: string;
  amount: string;
  ingredient: CatalogSelection;
  unit: CatalogSelection;
};

type VideoSelection = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

function isPositiveNumberString(s: string) {
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}

function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.errorText}>{message}</Text>;
}

export default function RecipeCreateScreen(_props: Props) {
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState<VideoSelection | null>(null);
  const [rows, setRows] = useState<IngredientRow[]>([
    {
      key: 'row-1',
      amount: '',
      ingredient: emptySelection,
      unit: emptySelection,
    },
  ]);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const errors = useMemo(() => {
    const next: {
      description?: string;
      video?: string;
      rows?: Record<string, { amount?: string; ingredient?: string; unit?: string }>;
      rowsTop?: string;
    } = {};

    if (!description.trim()) next.description = 'Description is required.';
    if (!video) next.video = 'Please select a video.';

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
  }, [description, rows, video]);

  const isValid =
    !errors.description &&
    !errors.video &&
    !errors.rowsTop &&
    (!errors.rows || Object.keys(errors.rows).length === 0);

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Media library permission is needed to pick a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setVideo({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    });
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: `row-${prev.length + 1}-${Date.now()}`,
        amount: '',
        ingredient: emptySelection,
        unit: emptySelection,
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function submit() {
    setAttemptedSubmit(true);
    if (!isValid) return;

    const payload = {
      description: description.trim(),
      video,
      ingredients: rows.map((r) => ({
        amount: Number(r.amount),
        ingredient: r.ingredient,
        unit: r.unit,
      })),
    };

    Alert.alert('Mock submit', 'Recipe upload payload is ready.', [
      { text: 'OK' },
      {
        text: 'Show JSON',
        onPress: () => Alert.alert('Payload', JSON.stringify(payload, null, 2)),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
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
          {attemptedSubmit ? <InlineError message={errors.description} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {attemptedSubmit ? <InlineError message={errors.rowsTop} /> : null}

          {rows.map((row, idx) => {
            const rowErr = errors.rows?.[row.key];
            return (
              <View key={row.key} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle}>Ingredient {idx + 1}</Text>
                  {rows.length > 1 ? (
                    <Pressable
                      onPress={() => removeRow(row.key)}
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
                  onChangeText={(t) => updateRow(row.key, { amount: t })}
                  placeholder="e.g. 2"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    attemptedSubmit && !!rowErr?.amount && styles.inputError,
                  ]}
                  accessibilityLabel={`Amount for ingredient ${idx + 1}`}
                />
                {attemptedSubmit ? <InlineError message={rowErr?.amount} /> : null}

                <IngredientPicker
                  value={row.ingredient}
                  onValueChange={(next) => updateRow(row.key, { ingredient: next })}
                />
                {attemptedSubmit ? <InlineError message={rowErr?.ingredient} /> : null}

                <UnitPicker
                  value={row.unit}
                  onValueChange={(next) => updateRow(row.key, { unit: next })}
                />
                {attemptedSubmit ? <InlineError message={rowErr?.unit} /> : null}
              </View>
            );
          })}

          <Pressable
            onPress={addRow}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Add ingredient"
          >
            <Text style={styles.secondaryButtonText}>Add ingredient</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video</Text>
          <Pressable
            onPress={() => void pickVideo()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Pick a video"
          >
            <Text style={styles.secondaryButtonText}>
              {video ? 'Change video' : 'Pick a video'}
            </Text>
          </Pressable>

          {video ? (
            <View style={styles.videoMeta}>
              <Text style={styles.videoLine} numberOfLines={1}>
                {video.fileName ?? video.uri}
              </Text>
              <Pressable
                onPress={() => setVideo(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove selected video"
              >
                <Text style={styles.removeText}>Remove video</Text>
              </Pressable>
            </View>
          ) : null}

          {attemptedSubmit ? <InlineError message={errors.video} /> : null}
        </View>

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
          <Text style={styles.summaryLine}>
            Ingredients: {rows.length}
          </Text>
          <Text style={styles.summaryLine}>
            Video: {video ? 'selected' : '—'}
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
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#b91c1c', fontSize: 13, marginTop: 4, marginBottom: 6 },
  rowCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  removeText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: 0.9 },
  videoMeta: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  videoLine: { fontSize: 14, color: '#334155' },
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
