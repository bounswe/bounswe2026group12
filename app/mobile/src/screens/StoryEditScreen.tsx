import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineFieldError } from '../components/recipe/InlineFieldError';
import { recipeFormStyles as form } from '../components/recipe/recipeFormStyles';
import { RegionPicker } from '../components/pickers/RegionPicker';
import { RecipeLinkPicker, type RecipeLink } from '../components/story/RecipeLinkPicker';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { fetchRecipesList } from '../services/recipeService';
import type { StoryLanguage } from '../services/mockStoryService';
import { fetchStoryById, updateStoryById, updateStoryImageById } from '../services/storyService';
import { tokens } from '../theme';
import { parseAuthorId } from '../utils/parseAuthorId';
import { isStoryAuthor } from '../utils/storyAuthor';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryEdit'>;

const LANGS: { label: string; value: StoryLanguage }[] = [
  { label: 'English', value: 'en' },
  { label: 'Turkish', value: 'tr' },
];

export default function StoryEditScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, isAuthenticated, isReady } = useAuth();
  const { showToast } = useToast();

  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready' | 'forbidden'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState<StoryLanguage>('en');
  const [linkedRecipe, setLinkedRecipe] = useState<RecipeLink | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [regionLabel, setRegionLabel] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const applyStory = useCallback((story: Awaited<ReturnType<typeof fetchStoryById>>) => {
    setTitle(story.title ?? '');
    setBody(story.body ?? '');
    setLanguage((story.language as StoryLanguage) || 'en');
    if (story.linked_recipe?.id) {
      setLinkedRecipe({
        id: story.linked_recipe.id,
        title: story.linked_recipe.title,
        region: story.linked_recipe.region,
      });
    } else {
      setLinkedRecipe(null);
    }
    setPublished(story.is_published !== false);
    setImageUri(story.image ?? null);
    setRegionId(story.region_id ?? null);
    setRegionLabel(story.region ?? null);
  }, []);

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
    setImageUri(asset.uri);
  }

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      setLoadState('forbidden');
      setLoadError('Please sign in to edit stories.');
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);
    fetchStoryById(id)
      .then((data) => {
        if (cancelled) return;
        if (!isStoryAuthor(user, data)) {
          setLoadState('forbidden');
          setLoadError('You can only edit your own stories.');
          return;
        }
        applyStory(data);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Could not load story.');
          setLoadState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken, user, applyStory, isReady, isAuthenticated]);

  const errors = useMemo(() => {
    const e: { title?: string; body?: string } = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!body.trim()) e.body = 'Body is required.';
    return e;
  }, [title, body]);

  const isValid = !errors.title && !errors.body;

  function submit() {
    setAttemptedSubmit(true);
    if (!isValid || submitting) return;

    setSubmitting(true);
    void (async () => {
      try {
        await updateStoryById(id, {
          title: title.trim(),
          body: body.trim(),
          language,
          linked_recipe: linkedRecipe ? Number(linkedRecipe.id) : null,
          is_published: published,
          region: regionId,
        });
        if (imageUri) {
          await updateStoryImageById(String(id), { uri: imageUri });
        }
        showToast('Story updated!', 'success');
        navigation.navigate('StoryDetail', { id });
      } catch {
        showToast('Failed to save changes. Please try again.', 'error');
      } finally {
        setSubmitting(false);
      }
    })();
  }

  if (!isReady || loadState === 'loading') {
    return (
      <SafeAreaView style={form.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <LoadingView message="Loading story…" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadState === 'error') {
    return (
      <SafeAreaView style={form.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <ErrorView
            message={loadError ?? 'Could not load story.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loadState === 'forbidden') {
    return (
      <SafeAreaView style={form.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#b91c1c', textAlign: 'center' }}>
            {loadError ?? 'You are not authorized to edit this story.'}
          </Text>
          {!isAuthenticated ? (
            <View style={{ marginTop: 14, alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
                accessibilityLabel="Go to Log In"
                style={({ pressed }) => [
                  form.primaryButton,
                  pressed && form.buttonPressed,
                  { width: '100%', maxWidth: 340 },
                ]}
              >
                <Text style={form.primaryButtonText}>Log In</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Register')}
                accessibilityRole="button"
                accessibilityLabel="Go to Register"
                style={({ pressed }) => [
                  form.secondaryButton,
                  pressed && form.buttonPressed,
                  { width: '100%', maxWidth: 340 },
                ]}
              >
                <Text style={form.secondaryButtonText}>Register</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={form.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={form.scroll} keyboardShouldPersistTaps="handled">
        <View style={form.card}>
          <Text style={form.heading} accessibilityRole="header">
            Edit story
          </Text>
          <Text style={form.lead}>Update your story and linked recipe. Changes are saved to the server.</Text>

          <View style={form.section}>
            <Text style={form.sectionTitle}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Story title"
              placeholderTextColor="#94a3b8"
              style={[form.input, attemptedSubmit && !!errors.title && form.inputError]}
              accessibilityLabel="Story title"
            />
            {attemptedSubmit ? <InlineFieldError message={errors.title} /> : null}
          </View>

          <View style={form.section}>
            <Text style={form.sectionTitle}>Body</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write your story…"
              placeholderTextColor="#94a3b8"
              style={[form.textArea, attemptedSubmit && !!errors.body && form.inputError]}
              multiline
              accessibilityLabel="Story body"
            />
            {attemptedSubmit ? <InlineFieldError message={errors.body} /> : null}
          </View>

          <View style={form.section}>
            <Text style={form.sectionTitle}>Image (optional)</Text>
            <Pressable
              onPress={() => void pickImage()}
              style={({ pressed }) => [styles.thumbButton, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel="Pick story image"
            >
              <Text style={styles.thumbButtonText}>
                {imageUri ? 'Change image' : 'Upload image'}
              </Text>
            </Pressable>
            {imageUri ? (
              <Pressable
                onPress={() => setImageUri(null)}
                style={({ pressed }) => [styles.thumbClear, pressed && { opacity: 0.9 }]}
                accessibilityRole="button"
                accessibilityLabel="Remove image"
              >
                <Text style={styles.thumbClearText}>Remove image</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={form.section}>
            <Text style={form.sectionTitle}>Language</Text>
            <View style={styles.langRow}>
              {LANGS.map((l) => {
                const active = l.value === language;
                return (
                  <Pressable
                    key={l.value}
                    onPress={() => setLanguage(l.value)}
                    style={({ pressed }) => [
                      styles.langPill,
                      active && styles.langPillActive,
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Set language ${l.label}`}
                  >
                    <Text style={[styles.langText, active && styles.langTextActive]}>{l.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <Switch
              value={published}
              onValueChange={setPublished}
              accessibilityLabel="Published visible to readers"
            />
            <Text style={{ flex: 1, fontSize: 15, color: tokens.colors.textMuted, marginLeft: 12 }}>
              Published
            </Text>
          </View>

          <View style={form.section}>
            <Text style={form.sectionTitle}>Region (optional)</Text>
            <RegionPicker
              value={regionId}
              fallbackLabel={regionLabel}
              onChange={(next) => {
                setRegionId(next ? next.id : null);
                setRegionLabel(next ? next.name : null);
              }}
            />
            <Text style={form.videoHint}>
              Tag the story with a region so it shows up on the map. If left empty, the linked
              recipe&apos;s region (if any) will be used as a fallback.
            </Text>
          </View>

          <View style={form.section}>
            <RecipeLinkPicker
              value={linkedRecipe}
              onChange={setLinkedRecipe}
              currentUserId={user ? Number(user.id) : null}
              fetchRecipes={async () => {
                const list = await fetchRecipesList();
                return list.map((r) => ({
                  id: r.id,
                  title: r.title,
                  region: r.region,
                  authorId: parseAuthorId(r.author) ?? undefined,
                }));
              }}
            />
          </View>

          <Pressable
            onPress={submit}
            disabled={submitting}
            style={({ pressed }) => [
              form.primaryButton,
              pressed && form.buttonPressed,
              submitting && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save story"
          >
            <Text style={form.primaryButtonText}>{submitting ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    backgroundColor: 'transparent',
  },
  langPillActive: { backgroundColor: tokens.colors.accentGreen, borderColor: tokens.colors.primary },
  langText: { fontSize: 14, fontWeight: '700', color: tokens.colors.text },
  langTextActive: { color: tokens.colors.text },
  thumbButton: {
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  thumbButtonText: { fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  thumbClear: { marginTop: 10, alignSelf: 'flex-start' },
  thumbClearText: { fontSize: 14, fontWeight: '700', color: tokens.colors.error },
});
