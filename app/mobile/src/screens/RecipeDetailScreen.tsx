import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { getMockRecipeById } from '../mocks/recipes';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

/** Short delay mirrors web async fetch UX without calling the API. */
const MOCK_LOAD_MS = 250;

export default function RecipeDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      const recipe = getMockRecipeById(id);
      if (cancelled) return;
      if (!recipe) {
        setError('Could not load recipe.');
      }
      setLoading(false);
    }, MOCK_LOAD_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [id]);

  const recipe = !loading && !error ? getMockRecipeById(id) : null;

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

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.error}>{error ?? 'Recipe not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.padded}>
        <Text style={styles.title} accessibilityRole="header">
          {recipe.title}
        </Text>
        <Text style={styles.meta}>{recipe.region}</Text>
        <Text style={styles.placeholder}>
          Placeholder: video, ingredients, and author actions will connect to the API in a
          later step.
        </Text>
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
  placeholder: { fontSize: 14, opacity: 0.65, marginTop: 20, lineHeight: 20 },
  error: { fontSize: 16, color: '#b91c1c' },
});
