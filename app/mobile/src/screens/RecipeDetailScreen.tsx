import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ResizeMode, Video } from 'expo-av';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { IngredientSubstitutesSheet } from '../components/recipe/IngredientSubstitutesSheet';
import { LinkedStoryPreviewCard } from '../components/recipe/LinkedStoryPreviewCard';
import { RecipeCommentsSection } from '../components/recipe/RecipeCommentsSection';
import type { RootStackParamList } from '../navigation/types';
import { fetchCheckedIngredients, toggleCheckedIngredient } from '../services/checkOffService';
import { fetchRecipeById } from '../services/recipeService';
import { fetchStoriesForRecipe, type StoryListItem } from '../services/storyService';
import { fetchConversion } from '../services/unitConversionService';
import type { RecipeDetail } from '../types/recipe';
import { isRecipeAuthor } from '../utils/recipeAuthor';
import { targetUnitFor, type ConvertedAmount } from '../utils/unitConversion';
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
  const [linkedStories, setLinkedStories] = useState<StoryListItem[]>([]);
  const [substituteTarget, setSubstituteTarget] = useState<{ id: number; name: string } | null>(null);
  const [convertedByLine, setConvertedByLine] = useState<Record<string, ConvertedAmount>>({});
  const [convertingLoading, setConvertingLoading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    let cancelled = false;
    fetchStoriesForRecipe(id)
      .then((items) => {
        if (!cancelled) setLinkedStories(items);
      })
      .catch(() => {
        if (!cancelled) setLinkedStories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  useEffect(() => {
    if (!showConverted || !recipe) return;
    const ingredients = recipe.ingredients ?? [];
    const targets = ingredients
      .map((ri, idx) => {
        const lineKey = ri.lineId != null ? `line-${ri.lineId}` : `idx-${idx}-${ri.ingredient.id}`;
        const toUnit = targetUnitFor(ri.unit.name);
        if (!toUnit) return null;
        return { lineKey, amount: ri.amount, fromUnit: ri.unit.name, toUnit, ingredientId: ri.ingredient.id };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    const missing = targets.filter((t) => convertedByLine[t.lineKey] === undefined);
    if (missing.length === 0) return;

    let cancelled = false;
    setConvertingLoading(true);
    Promise.allSettled(
      missing.map((t) => fetchConversion(t.amount, t.fromUnit, t.toUnit, t.ingredientId)),
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, ConvertedAmount> = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') next[missing[i].lineKey] = r.value;
        });
        if (Object.keys(next).length > 0) {
          setConvertedByLine((prev) => ({ ...prev, ...next }));
        }
      })
      .finally(() => {
        if (!cancelled) setConvertingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showConverted, recipe, convertedByLine]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCheckedIds(new Set());
      return;
    }
    let cancelled = false;
    fetchCheckedIngredients(id)
      .then((ids) => {
        if (!cancelled) setCheckedIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setCheckedIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, reloadToken]);

  const onToggleChecked = async (ingredientId: number) => {
    if (!isAuthenticated) return;
    const next = !checkedIds.has(ingredientId);
    setCheckedIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(ingredientId);
      else copy.delete(ingredientId);
      return copy;
    });
    try {
      const canonical = await toggleCheckedIngredient(id, ingredientId, next);
      setCheckedIds(new Set(canonical));
    } catch {
      setCheckedIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(ingredientId);
        else copy.add(ingredientId);
        return copy;
      });
    }
  };

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

  const authorObj =
    recipe.author && typeof recipe.author === 'object' && recipe.author.username && recipe.author.id != null
      ? recipe.author
      : null;

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
          {authorObj ? (
            <Pressable
              onPress={() =>
                navigation.navigate('UserProfile', {
                  userId: authorObj.id,
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
          ) : recipe.author ? (
            <Text style={styles.author}>By Author</Text>
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
                    {convertingLoading ? 'Converting…' : 'Converted'}
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
                const lineKey =
                  ri.lineId != null ? `line-${ri.lineId}` : `idx-${index}-${ri.ingredient.id}`;
                const converted = showConverted ? convertedByLine[lineKey] : undefined;
                const displayAmount = converted ? converted.amount : String(ri.amount);
                const displayUnit = converted ? converted.unit : ri.unit.name;
                const isChecked = checkedIds.has(ri.ingredient.id);
                return (
                  <View
                    key={
                      ri.lineId != null
                        ? `ing-line-${ri.lineId}`
                        : `ing-line-${index}-${ri.ingredient.id}`
                    }
                    style={styles.ingredientRow}
                  >
                    {isAuthenticated ? (
                      <Pressable
                        onPress={() => onToggleChecked(ri.ingredient.id)}
                        style={({ pressed }) => [
                          styles.checkbox,
                          isChecked && styles.checkboxChecked,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isChecked }}
                        accessibilityLabel={
                          isChecked
                            ? `Mark ${ri.ingredient.name} as not on hand`
                            : `Mark ${ri.ingredient.name} as on hand`
                        }
                        hitSlop={8}
                      >
                        {isChecked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                      </Pressable>
                    ) : null}
                    <View
                      style={[
                        styles.ingredientText,
                        isChecked && styles.ingredientTextChecked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ingredientName,
                          isChecked && styles.ingredientNameChecked,
                        ]}
                      >
                        {ri.ingredient.name}
                      </Text>
                      <Text
                        style={[
                          styles.ingredientAmount,
                          isChecked && styles.ingredientAmountChecked,
                        ]}
                      >
                        {' — '}
                        {displayAmount} {displayUnit}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        setSubstituteTarget({ id: ri.ingredient.id, name: ri.ingredient.name })
                      }
                      style={({ pressed }) => [styles.subBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Find substitutes for ${ri.ingredient.name}`}
                      hitSlop={8}
                    >
                      <Text style={styles.subBtnText}>Substitutes</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          <RecipeCommentsSection recipeId={id} qaEnabled={recipe.qa_enabled !== false} />

          <View style={styles.storiesSection}>
            <Text style={styles.sectionTitle}>Stories about this recipe</Text>
            {linkedStories.length === 0 ? (
              <Text style={styles.muted}>No stories linked to this recipe yet.</Text>
            ) : (
              <View style={styles.storyList}>
                {linkedStories.map((s) => (
                  <LinkedStoryPreviewCard
                    key={s.id}
                    title={s.title}
                    excerpt={s.body}
                    image={s.image}
                    authorUsername={s.authorUsername}
                    onPress={() => navigation.navigate('StoryDetail', { id: s.id })}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <IngredientSubstitutesSheet
        ingredientId={substituteTarget?.id ?? null}
        ingredientName={substituteTarget?.name ?? ''}
        onClose={() => setSubstituteTarget(null)}
      />
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
  authorPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: tokens.colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  authorPillText: { fontSize: 12, color: tokens.colors.text, fontWeight: '800' },
  qaMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 6 },
  editLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
  },
  editLinkText: { fontSize: 14, color: tokens.colors.textOnDark, fontWeight: '800', letterSpacing: 0.3 },
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
    backgroundColor: tokens.colors.accentGreen,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.textMuted,
  },
  unitToggleTextActive: {
    color: tokens.colors.text,
  },
  list: { gap: 0 },
  ingredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.primaryTint,
  },
  ingredientText: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  ingredientTextChecked: { opacity: 0.5 },
  ingredientName: { fontSize: 16, color: tokens.colors.text, fontWeight: '700' },
  ingredientNameChecked: { textDecorationLine: 'line-through' },
  ingredientAmount: { fontSize: 16, color: tokens.colors.text },
  ingredientAmountChecked: { textDecorationLine: 'line-through' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: tokens.colors.accentGreen,
  },
  checkboxMark: {
    color: tokens.colors.textOnDark,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  subBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  subBtnText: { fontSize: 12, fontWeight: '800', color: tokens.colors.textOnDark },
  pressed: { opacity: 0.85 },
  storiesSection: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: tokens.colors.primaryTint, gap: 12 },
  storyList: { gap: 10 },
});
