import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { getMockStoryById } from '../mocks/stories';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryDetail'>;

const MOCK_LOAD_MS = 250;

export default function StoryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      const story = getMockStoryById(id);
      if (cancelled) return;
      if (!story) {
        setError('Could not load story.');
      }
      setLoading(false);
    }, MOCK_LOAD_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [id]);

  const story = !loading && !error ? getMockStoryById(id) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel="Loading" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !story) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.error}>{error ?? 'Story not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.padded}>
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

        {story.linked_recipe ? (
          <View style={styles.linked}>
            <Text style={styles.linkedHeading}>Linked recipe</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('RecipeDetail', { id: story.linked_recipe!.id })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open linked recipe ${story.linked_recipe.title}`}
            >
              <View style={styles.linkedRow}>
                <Text style={styles.link}>{story.linked_recipe.title}</Text>
                {story.linked_recipe.region ? (
                  <Text style={styles.linkedRegion}> — {story.linked_recipe.region}</Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  padded: { flex: 1, padding: 20 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: { marginTop: 8, fontSize: 16 },
  title: { fontSize: 26, fontWeight: '700' },
  meta: { fontSize: 16, opacity: 0.75, marginTop: 8 },
  body: { fontSize: 16, marginTop: 16, lineHeight: 24 },
  linked: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  linkedHeading: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  linkedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  link: { fontSize: 16, color: '#2563eb', fontWeight: '600' },
  linkedRegion: { fontSize: 16, opacity: 0.75 },
  error: { fontSize: 16, color: '#b91c1c' },
});
