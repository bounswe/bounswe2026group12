import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineFieldError } from '../components/recipe/InlineFieldError';
import { recipeFormStyles as form } from '../components/recipe/recipeFormStyles';
import { RecipeLinkPicker, type RecipeLink } from '../components/story/RecipeLinkPicker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { fetchRecipesList } from '../services/recipeService';
import { apiPostJson } from '../services/httpClient';
import type { StoryLanguage } from '../services/mockStoryService';
import { tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryCreate'>;

const LANGS: { label: string; value: StoryLanguage }[] = [
  { label: 'English', value: 'en' },
  { label: 'Turkish', value: 'tr' },
];

export default function StoryCreateScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState<StoryLanguage>('en');
  const [linkedRecipe, setLinkedRecipe] = useState<RecipeLink | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e: { title?: string; body?: string } = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!body.trim()) e.body = 'Body is required.';
    return e;
  }, [title, body]);

  const isValid = !errors.title && !errors.body;

  async function pickThumbnail() {
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
    setThumbnailUri(asset.uri);
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
          linked_recipe: linkedRecipe ? linkedRecipe.id : null,
          // thumbnail upload TODO (needs multipart)
        });
        showToast('Story published!', 'success');
        navigation.navigate('StoryDetail', { id: created.id });
      } catch {
        showToast('Failed to publish story. Please try again.', 'error');
      } finally {
        setSubmitting(false);
      }
    })();
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
            <Text style={form.sectionTitle}>Thumbnail (optional)</Text>
            <Pressable
              onPress={() => void pickThumbnail()}
              style={({ pressed }) => [styles.thumbButton, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel="Pick story thumbnail"
            >
              <Text style={styles.thumbButtonText}>
                {thumbnailUri ? 'Change thumbnail' : 'Upload thumbnail'}
              </Text>
            </Pressable>
            {thumbnailUri ? (
              <Pressable
                onPress={() => setThumbnailUri(null)}
                style={({ pressed }) => [styles.thumbClear, pressed && { opacity: 0.9 }]}
                accessibilityRole="button"
                accessibilityLabel="Remove thumbnail"
              >
                <Text style={styles.thumbClearText}>Remove thumbnail</Text>
              </Pressable>
            ) : null}
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
                  authorId: r.author?.id,
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
    borderColor: tokens.colors.primary,
    backgroundColor: 'transparent',
  },
  langPillActive: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  langText: { fontSize: 14, fontWeight: '700', color: tokens.colors.primary },
  langTextActive: { color: tokens.colors.surface },
  thumbButton: {
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  thumbButtonText: { fontSize: 15, fontWeight: '800', color: tokens.colors.primary },
  thumbClear: { marginTop: 10, alignSelf: 'flex-start' },
  thumbClearText: { fontSize: 14, fontWeight: '700', color: tokens.colors.error },
});

