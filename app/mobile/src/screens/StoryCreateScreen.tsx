import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineFieldError } from '../components/recipe/InlineFieldError';
import { recipeFormStyles as form } from '../components/recipe/recipeFormStyles';
import { RegionPicker } from '../components/pickers/RegionPicker';
import { RecipeLinkPicker, type RecipeLink } from '../components/story/RecipeLinkPicker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { fetchRecipesList } from '../services/recipeService';
import { apiPostJson } from '../services/httpClient';
import type { StoryLanguage } from '../services/mockStoryService';
import { updateStoryImageById } from '../services/storyService';
import { tokens } from '../theme';
import { parseAuthorId } from '../utils/parseAuthorId';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryCreate'>;

const LANGS: { label: string; value: StoryLanguage }[] = [
  { label: 'English', value: 'en' },
  { label: 'Turkish', value: 'tr' },
];

export default function StoryCreateScreen({ navigation }: Props) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState<StoryLanguage>('en');
  const [linkedRecipe, setLinkedRecipe] = useState<RecipeLink | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e: { title?: string; body?: string } = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!body.trim()) e.body = 'Body is required.';
    return e;
  }, [title, body]);

  const isValid = !errors.title && !errors.body;

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

  function submit() {
    setAttemptedSubmit(true);
    if (!isValid || submitting) return;

    setSubmitting(true);
    void (async () => {
      try {
        const created = await apiPostJson<{ id: string }>('/api/stories/', {
          title: title.trim(),
          body: body.trim(),
          language,
          is_published: true,
          linked_recipe_id: linkedRecipe ? Number(linkedRecipe.id) : null,
          region: regionId,
        });
        if (imageUri) {
          await updateStoryImageById(String(created.id), { uri: imageUri });
        }
        showToast('Story published!', 'success');
        navigation.navigate('StoryDetail', { id: created.id });
      } catch (e) {
        showToast(
          e instanceof Error ? e.message : 'Failed to publish story. Please try again.',
          'error',
        );
      } finally {
        setSubmitting(false);
      }
    })();
  }

  if (isReady && !isAuthenticated) {
    return (
      <SafeAreaView style={form.safe} edges={['top', 'left', 'right']}>
        <View style={form.authGate}>
          <Text style={form.authGateHeading} accessibilityRole="header">
            Sign in to share a story
          </Text>
          <Text style={form.authGateBody}>
            Log in to publish stories — your drafts, comments, and saves all live under your account.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [form.primaryButton, pressed && form.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go to log in"
          >
            <Text style={form.primaryButtonText}>Log In</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Register')}
            style={({ pressed }) => [form.secondaryButton, pressed && form.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go to register"
          >
            <Text style={form.secondaryButtonText}>Register</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={form.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={form.scroll} keyboardShouldPersistTaps="handled">
        <View style={form.card}>
          <Text style={form.heading} accessibilityRole="header">
            Create story
          </Text>
          <Text style={form.lead}>
            Write a story and optionally link one of your recipes.
          </Text>

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
            <Text style={form.sectionTitle}>Region (optional)</Text>
            <RegionPicker
              value={regionId}
              onChange={(next) => setRegionId(next ? next.id : null)}
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
            accessibilityLabel="Publish story"
          >
            <Text style={form.primaryButtonText}>{submitting ? 'Publishing…' : 'Publish'}</Text>
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
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: 'transparent',
  },
  langPillActive: { backgroundColor: tokens.colors.accentGreen, borderColor: tokens.colors.surfaceDark },
  langText: { fontSize: 14, fontWeight: '700', color: tokens.colors.text },
  langTextActive: { color: tokens.colors.text },
  thumbButton: {
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
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

