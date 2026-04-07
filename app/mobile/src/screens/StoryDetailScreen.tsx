import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkedRecipePreviewCard } from '../components/story/LinkedRecipePreviewCard';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import { fetchStoryById } from '../services/storyService';
import type { StoryDetail } from '../types/story';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryDetail'>;

export default function StoryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
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
      .catch(() => {
        if (!cancelled) {
          setStory(null);
          setError('Could not load story.');
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.padded}>
        {story.thumbnail ? (
          <View style={styles.thumbWrap} accessibilityLabel="Story thumbnail">
            <Image source={{ uri: story.thumbnail }} style={styles.thumb} resizeMode="cover" />
          </View>
        ) : null}
        <Text style={styles.title} accessibilityRole="header">
          {story.title}
        </Text>
        {story.author ? (
          <Text style={styles.meta}>By {story.author.username}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  padded: { padding: 20, paddingBottom: 32 },
  paddedCenter: { flex: 1, padding: 20, justifyContent: 'center' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  thumb: { width: '100%', height: '100%' },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 15, color: '#64748b', marginTop: 8 },
  body: { fontSize: 16, marginTop: 16, lineHeight: 24, color: '#334155' },
  linked: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  linkedHeading: { fontSize: 18, fontWeight: '800', marginBottom: 10, color: '#0f172a' },
  noLinked: { fontSize: 15, color: '#64748b', lineHeight: 22 },
});
