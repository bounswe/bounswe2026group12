import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineFieldError } from '../components/recipe/InlineFieldError';
import { recipeFormStyles as form } from '../components/recipe/recipeFormStyles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { mockSubmitStoryCreate, type StoryLanguage } from '../services/mockStoryService';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryCreate'>;

type RegionRecipeLink = { id: string; title: string; region?: string };

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
  const [linkedRecipe, setLinkedRecipe] = useState<RegionRecipeLink | null>(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        const created = await mockSubmitStoryCreate({
          title,
          body,
          language,
          is_published: true,
          linked_recipe: linkedRecipe,
          author: user ? { username: user.username } : undefined,
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
        <Text style={form.heading} accessibilityRole="header">
          Create story
        </Text>
        <Text style={form.lead}>
          Write a story and optionally link a recipe. Linking will be upgraded to a mini-search
          in the next task; for now this is a placeholder.
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
          <Text style={form.sectionTitle}>Link a recipe (optional)</Text>
          {linkedRecipe ? (
            <View style={styles.linkedBox}>
              <Text style={styles.linkedText}>
                Linked: {linkedRecipe.title}
                {linkedRecipe.region ? ` — ${linkedRecipe.region}` : ''}
              </Text>
              <Pressable
                onPress={() => setLinkedRecipe(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove linked recipe"
              >
                <Text style={styles.removeLink}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.muted}>
              No recipe linked. You’ll be able to search and select one of your recipes in the next
              step.
            </Text>
          )}

          {/* Placeholder action so UX has an entry point without implementing #171 yet. */}
          {!linkedRecipe ? (
            <Pressable
              onPress={() =>
                setLinkedRecipe({ id: '1', title: 'Mock Anatolian stew', region: 'Anatolia' })
              }
              style={({ pressed }) => [form.secondaryButton, pressed && form.buttonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Link sample recipe"
            >
              <Text style={form.secondaryButtonText}>Link sample recipe</Text>
            </Pressable>
          ) : null}
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
          <Text style={form.primaryButtonText}>{submitting ? 'Publishing…' : 'Publish (mock)'}</Text>
        </Pressable>
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
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  langPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  langText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  langTextActive: { color: '#fff' },
  muted: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 12 },
  linkedBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkedText: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '600' },
  removeLink: { color: '#dc2626', fontWeight: '800', fontSize: 14 },
});

