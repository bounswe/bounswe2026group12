import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ResizeMode, Video } from 'expo-av';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import { fetchRecipeById } from '../services/recipeService';
import type { RecipeDetail } from '../types/recipe';
import { isRecipeAuthor } from '../utils/recipeAuthor';
import { convertIngredient } from '../utils/unitConversion';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, isAuthenticated, isReady } = useAuth();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [showConverted, setShowConverted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRecipeById(id)
      .then((data) => {
        if (!cancelled) setRecipe(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setRecipe(null);
          setError(e instanceof Error ? e.message : 'Could not load recipe.');
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

  /** Hide Edit until session is restored from storage (avoids flash for signed-in authors). */
  const canEdit = isReady && isAuthenticated && isRecipeAuthor(user, recipe);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {recipe.title}
          </Text>
          {recipe.region ? <Text style={styles.meta}>{recipe.region}</Text> : null}
          {recipe.author ? (
            <Text style={styles.author}>
              By{' '}
              {typeof recipe.author === 'object' && recipe.author.username
                ? recipe.author.username
                : 'Author'}
            </Text>
          ) : null}

          {typeof recipe.qa_enabled === 'boolean' ? (
            <Text style={styles.qaMeta}>
              Q&amp;A: {recipe.qa_enabled ? 'enabled' : 'disabled'}
            </Text>
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

          {recipe.image ? (
            <View style={styles.imageWrap} accessibilityLabel="Recipe image">
              <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
            </View>
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

          <View style={styles.ingredientsHeader}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {ingredients.length > 0 ? (
              <View style={styles.unitToggle} accessibilityRole="tablist">
                <Pressable
                  onPress={() => setShowConverted(false)}
                  style={[styles.unitToggleBtn, !showConverted && styles.unitToggleBtnActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: !showConverted }}
                  accessibilityLabel="Show original units"
                >
                  <Text style={[styles.unitToggleText, !showConverted && styles.unitToggleTextActive]}>
                    Original
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowConverted(true)}
                  style={[styles.unitToggleBtn, showConverted && styles.unitToggleBtnActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: showConverted }}
                  accessibilityLabel="Show converted units"
                >
                  <Text style={[styles.unitToggleText, showConverted && styles.unitToggleTextActive]}>
                    Converted
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          {ingredients.length === 0 ? (
            <Text style={styles.muted}>No ingredients listed.</Text>
          ) : (
            <View style={styles.list}>
              {ingredients.map((ri, index) => {
                const converted = showConverted
                  ? convertIngredient(ri.amount, ri.unit.name)
                  : null;
                const displayAmount = converted ? converted.amount : String(ri.amount);
                const displayUnit = converted ? converted.unit : ri.unit.name;
                return (
                  <View
                    key={
                      ri.lineId != null
                        ? `ing-line-${ri.lineId}`
                        : `ing-line-${index}-${ri.ingredient.id}`
                    }
                    style={styles.ingredientRow}
                  >
                    <Text style={styles.ingredientName}>{ri.ingredient.name}</Text>
                    <Text style={styles.ingredientAmount}>
                      {' — '}
                      {displayAmount} {displayUnit}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    padding: 16,
    ...shadows.lg,
  },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  meta: { fontSize: 14, color: tokens.colors.textMuted, marginTop: 6 },
  author: { fontSize: 14, color: tokens.colors.textMuted, marginTop: 4 },
  qaMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 6 },
  editLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  editLinkText: { fontSize: 16, color: tokens.colors.primary, fontWeight: '800' },
  imageWrap: {
    marginTop: 14,
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surfaceDark,
    ...shadows.lg,
  },
  image: { width: '100%', height: '100%' },
  videoWrap: {
    marginTop: 16,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surfaceDark,
    ...shadows.lg,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  noVideo: {
    marginTop: 16,
    fontSize: 14,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
  },
  description: {
    marginTop: 18,
    fontSize: 16,
    color: tokens.colors.text,
    lineHeight: 24,
  },
  muted: { marginTop: 12, fontSize: 15, color: tokens.colors.textMuted },
  ingredientsHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
  },
  unitToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  unitToggleBtnActive: {
    backgroundColor: tokens.colors.primary,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.textMuted,
  },
  unitToggleTextActive: {
    color: tokens.colors.surface,
  },
  list: { gap: 0 },
  ingredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.primaryTint,
  },
  ingredientName: { fontSize: 16, color: tokens.colors.text, fontWeight: '700' },
  ingredientAmount: { fontSize: 16, color: tokens.colors.text },
});
