import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ResizeMode, Video } from 'expo-av';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import { fetchRecipeById } from '../services/recipeService';
import type { RecipeDetail } from '../types/recipe';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, isAuthenticated } = useAuth();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRecipeById(id)
      .then((data) => {
        if (!cancelled) setRecipe(data);
      })
      .catch(() => {
        if (!cancelled) {
          setRecipe(null);
          setError('Could not load recipe.');
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
          <LoadingView message="Loading recipe…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView
            message={error ?? 'Recipe not found.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const ingredients = recipe.ingredients ?? [];

  const canEdit =
    isAuthenticated &&
    recipe.author != null &&
    user != null &&
    Number(user.id) === Number(recipe.author.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} accessibilityRole="header">
          {recipe.title}
        </Text>
        {recipe.region ? <Text style={styles.meta}>{recipe.region}</Text> : null}
        {recipe.author?.username ? (
          <Text style={styles.author}>By {recipe.author.username}</Text>
        ) : null}

        {canEdit ? (
          <Pressable
            onPress={() => navigation.navigate('RecipeEdit', { id })}
            style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Edit recipe"
          >
            <Text style={styles.editLinkText}>Edit recipe</Text>
          </Pressable>
        ) : null}

        {recipe.video ? (
          <View style={styles.videoWrap} accessibilityLabel="Recipe video">
            <Video
              style={styles.video}
              source={{ uri: recipe.video }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          </View>
        ) : (
          <Text style={styles.noVideo}>No video for this recipe.</Text>
        )}

        {recipe.description ? (
          <Text style={styles.description}>{recipe.description}</Text>
        ) : (
          <Text style={styles.muted}>No description.</Text>
        )}

        <Text style={styles.sectionTitle}>Ingredients</Text>
        {ingredients.length === 0 ? (
          <Text style={styles.muted}>No ingredients listed.</Text>
        ) : (
          <View style={styles.list}>
            {ingredients.map((ri, index) => (
              <View
                key={`${ri.ingredient.id}-${index}`}
                style={styles.ingredientRow}
              >
                <Text style={styles.ingredientName}>{ri.ingredient.name}</Text>
                <Text style={styles.ingredientAmount}>
                  {' — '}
                  {String(ri.amount)} {ri.unit.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 32 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 16, color: '#64748b', marginTop: 8 },
  author: { fontSize: 15, color: '#64748b', marginTop: 4 },
  editLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  editLinkText: { fontSize: 16, color: '#2563eb', fontWeight: '700' },
  videoWrap: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  noVideo: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  description: {
    marginTop: 18,
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
  },
  muted: { marginTop: 12, fontSize: 15, color: '#94a3b8' },
  sectionTitle: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  list: { gap: 0 },
  ingredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  ingredientName: { fontSize: 16, color: '#0f172a', fontWeight: '600' },
  ingredientAmount: { fontSize: 16, color: '#475569' },
});
