import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildRecipePatchJsonBody,
  buildRecipeImageOnlyFormData,
  buildRecipeVideoOnlyFormData,
} from '../components/recipe/buildRecipeUpdateFormData';
import { InlineFieldError } from '../components/recipe/InlineFieldError';
import { RecipeIngredientRowsSection } from '../components/recipe/RecipeIngredientRowsSection';
import { RecipeVideoSection } from '../components/recipe/RecipeVideoSection';
import {
  authoringRowsFromRecipe,
  isPositiveNumberString,
  makeEmptyIngredientRow,
  type AuthoringIngredientRow,
} from '../components/recipe/recipeFormState';
import { recipeFormStyles as styles } from '../components/recipe/recipeFormStyles';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { fetchRecipeById, patchRecipeJson, updateRecipeById } from '../services/recipeService';
import type { RecipeDetail } from '../types/recipe';
import { isRecipeAuthor } from '../utils/recipeAuthor';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeEdit'>;

export default function RecipeEditScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, isAuthenticated, isReady } = useAuth();
  const { showToast } = useToast();

  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready' | 'forbidden'>(
    'loading',
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [qaEnabled, setQaEnabled] = useState(true);
  const [rows, setRows] = useState<AuthoringIngredientRow[]>([makeEmptyIngredientRow()]);
  const [localImage, setLocalImage] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);
  const [localVideo, setLocalVideo] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);
  const [remoteVideoUrl, setRemoteVideoUrl] = useState<string | null>(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const applyRecipe = useCallback((recipe: RecipeDetail) => {
    setTitle(recipe.title ?? '');
    setDescription(recipe.description ?? '');
    setRegion(recipe.region ?? '');
    setQaEnabled(recipe.qa_enabled ?? true);
    setRows(authoringRowsFromRecipe(recipe.ingredients));
    setLocalImage(null);
    setLocalVideo(null);
    setRemoteVideoUrl(recipe.video ?? null);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      setLoadState('forbidden');
      setLoadError('Please sign in to edit recipes.');
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);
    fetchRecipeById(id)
      .then((data) => {
        if (cancelled) return;
        if (!isRecipeAuthor(user, data)) {
          setLoadState('forbidden');
          return;
        }
        applyRecipe(data);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Could not load recipe.');
          setLoadState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken, user, applyRecipe, isReady, isAuthenticated]);

  const validation = useMemo(() => {
    const e: { title?: string; amount?: string } = {};
    if (!title.trim()) e.title = 'Title is required.';
    for (const row of rows) {
      if (row.amount.trim() !== '' && !isPositiveNumberString(row.amount.trim())) {
        e.amount = 'Amount must be a positive number.';
        break;
      }
    }
    return e;
  }, [title, rows]);

  const isValid = !validation.title && !validation.amount;

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

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Media library permission is needed to pick an image.', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setLocalImage({
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

    const jsonBody = buildRecipePatchJsonBody({
      title,
      description,
      region,
      qaEnabled,
      rows,
    });

    void (async () => {
      try {
        await patchRecipeJson(id, jsonBody);
        if (localImage) {
          await updateRecipeById(
            id,
            buildRecipeImageOnlyFormData({
              uri: localImage.uri,
              name: localImage.fileName,
              type: localImage.mimeType,
            }),
          );
        }
        if (localVideo) {
          await updateRecipeById(id, buildRecipeVideoOnlyFormData(localVideo));
        }
        showToast('Recipe updated!', 'success');
        setTimeout(() => navigation.navigate('RecipeDetail', { id }), 1500);
      } catch {
        showToast('Failed to save changes. Please try again.', 'error');
      }
    })();
  }

  if (!isReady || loadState === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <LoadingView message="Loading recipe…" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadState === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <ErrorView
            message={loadError ?? 'Could not load recipe.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loadState === 'forbidden') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#b91c1c', textAlign: 'center' }}>
            {loadError ?? 'You are not authorized to edit this recipe.'}
          </Text>
          {!isAuthenticated ? (
            <View style={{ marginTop: 14, alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
                accessibilityLabel="Go to Log In"
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  { width: '100%', maxWidth: 340 },
                ]}
              >
                <Text style={styles.primaryButtonText}>Log In</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Register')}
                accessibilityRole="button"
                accessibilityLabel="Go to Register"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                  { width: '100%', maxWidth: 340 },
                ]}
              >
                <Text style={styles.secondaryButtonText}>Register</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading} accessibilityRole="header">
          Edit recipe
        </Text>
        <Text style={styles.lead}>
          Same fields as the web edit form. Save sends a multipart PATCH to{' '}
          <Text style={{ fontWeight: '600' }}>/api/recipes/{id}/</Text> when the backend is
          available; otherwise a mock update runs.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe title"
            placeholderTextColor="#94a3b8"
            style={[
              styles.input,
              attemptedSubmit && !!validation.title && styles.inputError,
            ]}
            accessibilityLabel="Recipe title"
          />
          {attemptedSubmit ? <InlineFieldError message={validation.title} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor="#94a3b8"
            style={styles.textArea}
            multiline
            accessibilityLabel="Recipe description"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Region</Text>
          <TextInput
            value={region}
            onChangeText={setRegion}
            placeholder="Region"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            accessibilityLabel="Recipe region"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <Switch
            value={qaEnabled}
            onValueChange={setQaEnabled}
            accessibilityLabel="Enable Q and A on this recipe"
          />
          <Text style={{ flex: 1, fontSize: 15, color: '#334155', marginLeft: 12 }}>
            Enable Q&amp;A on this recipe
          </Text>
        </View>

        <RecipeIngredientRowsSection
          rows={rows}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          onUpdateRow={updateRow}
          attemptedSubmit={false}
        />

        {attemptedSubmit ? <InlineFieldError message={validation.amount} /> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thumbnail image (optional)</Text>
          <Pressable
            onPress={() => void pickImage()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Pick recipe thumbnail image"
          >
            <Text style={styles.secondaryButtonText}>
              {localImage ? 'Change image' : 'Upload image'}
            </Text>
          </Pressable>
          {localImage ? (
            <Pressable
              onPress={() => setLocalImage(null)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed, { marginTop: 10 }]}
              accessibilityRole="button"
              accessibilityLabel="Remove recipe thumbnail image"
            >
              <Text style={styles.secondaryButtonText}>Remove image</Text>
            </Pressable>
          ) : null}
        </View>

        <RecipeVideoSection
          onPickPress={() => void pickVideo()}
          localVideo={localVideo}
          onClearLocal={() => setLocalVideo(null)}
          remoteVideoUrl={remoteVideoUrl}
          requireSelection={false}
          attemptedSubmit={false}
        />

        <Pressable
          onPress={submit}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Save recipe changes"
        >
          <Text style={styles.primaryButtonText}>Save changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
