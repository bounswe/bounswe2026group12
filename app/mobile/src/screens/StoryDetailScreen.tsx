import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkedRecipePreviewCard } from '../components/story/LinkedRecipePreviewCard';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { fetchStoryById } from '../services/storyService';
import type { StoryDetail } from '../types/story';
import { shadows, tokens } from '../theme';
import { isStoryAuthor } from '../utils/storyAuthor';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryDetail'>;

export default function StoryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, isAuthenticated, isReady } = useAuth();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStoryById(id)
      .then((data) => {
        if (!cancelled) setStory(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setStory(null);
          setError(e instanceof Error ? e.message : 'Could not load story.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading story…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !story) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.paddedCenter}>
          <ErrorView
            message={error ?? 'Story not found.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = isReady && isAuthenticated && isStoryAuthor(user, story);

  const authorObj =
    story.author && typeof story.author === 'object' && story.author.username && story.author.id != null
      ? story.author
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.padded}>
        <View style={styles.card}>
          {story.image ? (
            <View style={styles.thumbWrap} accessibilityLabel="Story image">
              <Image source={{ uri: story.image }} style={styles.thumb} resizeMode="cover" />
            </View>
          ) : null}
          <Text style={styles.title} accessibilityRole="header">
            {story.title}
          </Text>
          {authorObj ? (
            <Pressable
              onPress={() =>
                navigation.navigate('UserProfile', {
                  userId: authorObj.id as number,
                  username: authorObj.username,
                })
              }
              style={({ pressed }) => [styles.authorPill, pressed && { opacity: 0.85 }]}
              accessibilityRole="link"
              accessibilityLabel={`Open profile of ${authorObj.username}`}
              hitSlop={6}
            >
              <Text style={styles.authorPillText}>By {authorObj.username}</Text>
            </Pressable>
          ) : story.author ? (
            <Text style={styles.meta}>By Author</Text>
          ) : null}
          {canEdit ? (
            <Pressable
              onPress={() => navigation.navigate('StoryEdit', { id })}
              style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Edit story"
            >
              <Text style={styles.editLinkText}>Edit story</Text>
            </Pressable>
          ) : null}
          {story.language ? (
            <Text style={styles.meta}>Language: {story.language.toUpperCase()}</Text>
          ) : null}
          <Text style={styles.body}>{story.body}</Text>

          <View style={styles.linked}>
            <Text style={styles.linkedHeading}>Linked Recipe</Text>
            {story.linked_recipe ? (
              <LinkedRecipePreviewCard
                onPress={() =>
                  navigation.navigate('RecipeDetail', { id: story.linked_recipe!.id })
                }
                recipe={story.linked_recipe}
              />
            ) : (
              <Text style={styles.noLinked}>No recipe is linked to the story.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  padded: { padding: 20, paddingBottom: 32 },
  paddedCenter: { flex: 1, padding: 20, justifyContent: 'center' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    padding: 16,
    ...shadows.lg,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
    marginBottom: 16,
    ...shadows.lg,
  },
  thumb: { width: '100%', height: '100%' },
  title: { fontSize: 24, fontWeight: '800', color: tokens.colors.text, fontFamily: tokens.typography.display.fontFamily },
  meta: { fontSize: 14, color: tokens.colors.textMuted, marginTop: 8 },
  authorPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: tokens.colors.bg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  authorPillText: { fontSize: 13, color: tokens.colors.text, fontWeight: '800', letterSpacing: 0.2 },
  body: { fontSize: 16, marginTop: 16, lineHeight: 24, color: tokens.colors.text },
  linked: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: tokens.colors.primaryTint },
  linkedHeading: { fontSize: 18, fontWeight: '800', marginBottom: 10, color: tokens.colors.text, fontFamily: tokens.typography.display.fontFamily },
  noLinked: { fontSize: 15, color: tokens.colors.textMuted, lineHeight: 22 },
  editLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  editLinkText: { fontSize: 16, color: tokens.colors.text, fontWeight: '800' },
});
