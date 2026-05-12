import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { ResizeMode, Video } from 'expo-av';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { IngredientSubstitutesSheet } from '../components/recipe/IngredientSubstitutesSheet';
import { LinkedStoryPreviewCard } from '../components/recipe/LinkedStoryPreviewCard';
import { StarRatingRow, type StarScore } from '../components/recipe/StarRatingRow';
import { removeRating, submitRating } from '../services/ratingService';
import { EndangeredHeritageSection } from '../components/heritage/EndangeredHeritageSection';
import { HeritageBadge } from '../components/heritage/HeritageBadge';
import { RecipeCommentsSection } from '../components/recipe/RecipeCommentsSection';
import { DidYouKnowSection } from '../components/cultural/DidYouKnowSection';
import { fetchCulturalFactsByRegion, type CulturalFact } from '../services/culturalFactService';
import type { RootStackParamList } from '../navigation/types';
import { fetchCheckedIngredients, toggleCheckedIngredient } from '../services/checkOffService';
import { toggleBookmark } from '../services/bookmarkService';
import { tryRecipe } from '../services/passportActionService';
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
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [culturalFacts, setCulturalFacts] = useState<CulturalFact[]>([]);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [triedBusy, setTriedBusy] = useState(false);
  const { showToast } = useToast();

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
    // Intentionally omit `convertedByLine`: keeping it in deps caused the
    // effect to re-run after every batch result and produce a flicker /
    // wasted render cycle. We only need the effect to fire when the toggle
    // or the recipe itself changes; the inner `missing` filter still uses
    // the current state via closure capture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConverted, recipe]);

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

  useEffect(() => {
    const regionId = recipe?.region_id;
    if (regionId == null) {
      setCulturalFacts([]);
      return;
    }
    let cancelled = false;
    fetchCulturalFactsByRegion(regionId)
      .then((facts) => {
        if (!cancelled) setCulturalFacts(facts);
      })
      .catch(() => {
        if (!cancelled) setCulturalFacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [recipe?.region_id]);

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

  const shoppingItems = ingredients
    .filter((ri) => !checkedIds.has(ri.ingredient.id))
    .map((ri) => ({
      key: `shop-${ri.lineId ?? ri.ingredient.id}`,
      name: ri.ingredient.name,
      amount: String(ri.amount),
      unit: ri.unit.name,
    }));

  async function copyShoppingList() {
    if (shoppingItems.length === 0) return;
    const text = shoppingItems.map((i) => `${i.name} — ${i.amount} ${i.unit}`).join('\n');
    try {
      await Clipboard.setStringAsync(text);
      showToast('Shopping list copied to clipboard', 'success');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  }

  const authorObj =
    recipe.author && typeof recipe.author === 'object' && recipe.author.username && recipe.author.id != null
      ? recipe.author
      : null;

  /** Hide Edit until session is restored from storage (avoids flash for signed-in authors). */
  const canEdit = isReady && isAuthenticated && isRecipeAuthor(user, recipe);
  const isOwnRecipe = isReady && isAuthenticated && isRecipeAuthor(user, recipe);

  const avgRatingNum = (() => {
    const v = recipe.average_rating;
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  })();
  const ratingCount = recipe.rating_count ?? 0;
  const userRating = recipe.user_rating ?? null;
  const ratingInteractive = isReady && isAuthenticated && !isOwnRecipe;

  async function handleRate(score: StarScore | 0) {
    if (!recipe || ratingBusy) return;
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (isOwnRecipe) {
      showToast('You cannot rate your own recipe.', 'error');
      return;
    }
    // Snapshot for rollback.
    const prevUser = recipe.user_rating ?? null;
    const prevAvg = avgRatingNum;
    const prevCount = ratingCount;

    // Optimistic aggregate recompute (best-effort; backend response is authoritative).
    let optimisticAvg = prevAvg;
    let optimisticCount = prevCount;
    if (score === 0) {
      if (prevUser != null && prevCount > 0) {
        const sum = (prevAvg ?? 0) * prevCount - prevUser;
        optimisticCount = prevCount - 1;
        optimisticAvg = optimisticCount > 0 ? sum / optimisticCount : null;
      }
    } else if (prevUser == null) {
      const sum = (prevAvg ?? 0) * prevCount + score;
      optimisticCount = prevCount + 1;
      optimisticAvg = sum / optimisticCount;
    } else {
      const sum = (prevAvg ?? 0) * prevCount - prevUser + score;
      optimisticAvg = prevCount > 0 ? sum / prevCount : score;
    }

    setRatingBusy(true);
    setRecipe((r) =>
      r
        ? {
            ...r,
            user_rating: score === 0 ? null : score,
            average_rating: optimisticAvg,
            rating_count: optimisticCount,
          }
        : r,
    );

    try {
      if (score === 0) {
        await removeRating(recipe.id);
        // 204 — refetch to get authoritative aggregate.
        setReloadToken((t) => t + 1);
      } else {
        const next = await submitRating(recipe.id, score);
        setRecipe((r) =>
          r
            ? {
                ...r,
                user_rating: next.user_rating ?? score,
                average_rating: next.average_rating,
                rating_count: next.rating_count,
              }
            : r,
        );
      }
    } catch (e) {
      // Rollback.
      setRecipe((r) =>
        r
          ? {
              ...r,
              user_rating: prevUser,
              average_rating: prevAvg,
              rating_count: prevCount,
            }
          : r,
      );
      const msg = e instanceof Error ? e.message : 'Could not save rating.';
      showToast(
        msg.includes('cannot rate your own') ? 'You cannot rate your own recipe.' : 'Could not save rating.',
        'error',
      );
    } finally {
      setRatingBusy(false);
    }
  }

  const onToggleBookmark = async () => {
    // Auth gate mirrors the create-screen convention — unauthenticated users
    // are routed to Login instead of seeing a silent no-op tap.
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (bookmarkBusy) return;
    const prevFlag = recipe.is_bookmarked === true;
    const prevCount = typeof recipe.bookmark_count === 'number' ? recipe.bookmark_count : 0;
    const nextFlag = !prevFlag;
    const optimisticCount = Math.max(0, prevCount + (nextFlag ? 1 : -1));
    setBookmarkBusy(true);
    setRecipe((prev) =>
      prev ? { ...prev, is_bookmarked: nextFlag, bookmark_count: optimisticCount } : prev,
    );
    try {
      const result = await toggleBookmark(id);
      setRecipe((prev) =>
        prev
          ? { ...prev, is_bookmarked: result.is_bookmarked, bookmark_count: result.bookmark_count }
          : prev,
      );
    } catch (e) {
      // Rollback to the pre-tap state and surface the failure via the same
      // toast channel the rest of the screen uses for errors.
      setRecipe((prev) =>
        prev ? { ...prev, is_bookmarked: prevFlag, bookmark_count: prevCount } : prev,
      );
      showToast(e instanceof Error ? e.message : 'Could not update bookmark.', 'error');
    } finally {
      setBookmarkBusy(false);
    }
  };

  const isBookmarked = recipe.is_bookmarked === true;
  const bookmarkCount =
    typeof recipe.bookmark_count === 'number' ? recipe.bookmark_count : undefined;

  /**
   * "I Tried This" toggle (#599). Active state is sourced from the recipe
   * payload (`is_tried`, surfaced by backend #584) so a fresh load reflects
   * the user's existing stamp. Optimistic toggle + rollback on error,
   * mirroring the bookmark pattern above. The backend's `/try/` endpoint
   * idempotently records the action and pins the recipe to the passport,
   * so a separate "Add to passport" affordance would target a non-existent
   * route — see review on PR #783.
   */
  const isTried = recipe.is_tried === true;

  const onToggleTried = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (triedBusy) return;
    const prevFlag = isTried;
    const nextFlag = !prevFlag;
    setTriedBusy(true);
    setRecipe((prev) => (prev ? { ...prev, is_tried: nextFlag } : prev));
    try {
      const result = await tryRecipe(id, nextFlag);
      setRecipe((prev) => (prev ? { ...prev, is_tried: result.is_tried } : prev));
    } catch (e) {
      setRecipe((prev) => (prev ? { ...prev, is_tried: prevFlag } : prev));
      showToast(
        e instanceof Error ? e.message : 'Could not update tried status.',
        'error',
      );
    } finally {
      setTriedBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {recipe.title}
          </Text>
          {recipe.region ? (
            <Pressable
              onPress={() =>
                navigation.navigate('Search', { region: recipe.region as string })
              }
              style={({ pressed }) => [styles.regionPill, pressed && { opacity: 0.85 }]}
              accessibilityRole="link"
              accessibilityLabel={`Browse ${recipe.region} recipes`}
              hitSlop={10}
            >
              <Text style={styles.regionPillText}>{recipe.region}</Text>
            </Pressable>
          ) : null}
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
              hitSlop={10}
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

          <View style={styles.ratingBlock}>
            <StarRatingRow
              value={userRating ?? (ratingInteractive ? 0 : avgRatingNum)}
              size="lg"
              readOnly={!ratingInteractive}
              onChange={ratingInteractive ? handleRate : undefined}
              ariaLabel={
                ratingInteractive
                  ? userRating
                    ? `Your rating: ${userRating} of 5`
                    : 'Rate this recipe'
                  : avgRatingNum != null
                    ? `Average rating ${avgRatingNum.toFixed(1)} of 5`
                    : 'Not rated yet'
              }
            />
            <Text style={styles.ratingCaption}>
              {ratingCount === 0
                ? 'Not rated yet'
                : `${(avgRatingNum ?? 0).toFixed(1)} ★ · ${ratingCount} rating${ratingCount === 1 ? '' : 's'}`}
            </Text>
            {isOwnRecipe ? (
              <Text style={styles.ratingHint}>You can't rate your own recipe</Text>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => void onToggleBookmark()}
              disabled={bookmarkBusy}
              style={({ pressed }) => [
                styles.bookmarkBtn,
                isBookmarked && styles.bookmarkBtnActive,
                pressed && { opacity: 0.85 },
                bookmarkBusy && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isBookmarked, busy: bookmarkBusy }}
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Save recipe to bookmarks'}
              hitSlop={8}
            >
              <Text style={styles.bookmarkIcon}>{isBookmarked ? '🔖' : '🏷'}</Text>
              <Text style={[styles.bookmarkText, isBookmarked && styles.bookmarkTextActive]}>
                {isBookmarked ? 'Saved' : 'Save'}
                {bookmarkCount != null ? ` · ${bookmarkCount}` : ''}
              </Text>
            </Pressable>

            {isAuthenticated ? (
              <Pressable
                onPress={() => void onToggleTried()}
                disabled={triedBusy}
                style={({ pressed }) => [
                  styles.passportBtn,
                  isTried && styles.triedBtnActive,
                  pressed && { opacity: 0.85 },
                  triedBusy && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isTried, busy: triedBusy }}
                accessibilityLabel={
                  isTried ? 'Mark as not tried' : "Mark 'I tried this'"
                }
                hitSlop={8}
              >
                <Text style={styles.passportIcon}>{isTried ? '✓' : '🍴'}</Text>
                <Text
                  style={[
                    styles.passportText,
                    isTried && styles.passportTextOnDark,
                  ]}
                >
                  {isTried ? 'Tried' : 'I Tried This'}
                </Text>
              </Pressable>
            ) : null}
          </View>

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

          {isAuthenticated && ingredients.length > 0 ? (
            <View style={styles.shoppingSection}>
              <Pressable
                onPress={() => setShowShoppingList((v) => !v)}
                style={({ pressed }) => [styles.shoppingToggle, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={
                  showShoppingList ? 'Hide shopping list' : `Show shopping list with ${shoppingItems.length} items`
                }
              >
                <Text style={styles.shoppingToggleText}>
                  {showShoppingList
                    ? 'Hide shopping list'
                    : `Shopping list (${shoppingItems.length})`}
                </Text>
              </Pressable>

              {showShoppingList ? (
                <View style={styles.shoppingPanel}>
                  <View style={styles.shoppingPanelHeader}>
                    <Text style={styles.shoppingPanelTitle}>Shopping List</Text>
                    {shoppingItems.length > 0 ? (
                      <Pressable
                        onPress={() => void copyShoppingList()}
                        style={({ pressed }) => [styles.shoppingCopyBtn, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Copy shopping list to clipboard"
                      >
                        <Text style={styles.shoppingCopyBtnText}>Copy</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {shoppingItems.length === 0 ? (
                    <Text style={styles.shoppingEmpty}>All ingredients are checked off!</Text>
                  ) : (
                    <View style={styles.shoppingList}>
                      {shoppingItems.map((item) => (
                        <View key={item.key} style={styles.shoppingItem}>
                          <Text style={styles.shoppingItemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={styles.shoppingItemQty}>
                            {item.amount} {item.unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          <EndangeredHeritageSection
            status={recipe.heritage_status}
            notes={recipe.endangered_notes ?? []}
          />

          <DidYouKnowSection facts={culturalFacts} />

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
                    onPressAuthor={
                      s.authorId && s.authorUsername
                        ? () =>
                            navigation.navigate('UserProfile', {
                              userId: s.authorId as string,
                              username: s.authorUsername ?? undefined,
                            })
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
          </View>

          {recipe.heritage_group ? (
            <HeritageBadge
              groupName={recipe.heritage_group.name}
              onPress={() =>
                navigation.navigate('Heritage', {
                  heritageGroupId: recipe.heritage_group!.id,
                })
              }
            />
          ) : null}
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
  regionPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  regionPillText: { fontSize: 12, color: tokens.colors.text, fontWeight: '800', letterSpacing: 0.2 },
  author: { fontSize: 14, color: tokens.colors.textMuted, marginTop: 4 },
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
  ratingBlock: { marginTop: 14, gap: 4 },
  ratingCaption: { fontSize: 13, color: tokens.colors.textMuted, fontWeight: '600' },
  ratingHint: { fontSize: 12, color: tokens.colors.textMuted, marginTop: 4 },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
  },
  passportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
  },
  triedBtnActive: {
    backgroundColor: tokens.colors.accentGreen,
  },
  passportIcon: { fontSize: 16 },
  passportText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: 0.3,
  },
  passportTextOnDark: { color: tokens.colors.textOnDark },
  bookmarkBtnActive: {
    backgroundColor: tokens.colors.accentGreenTint,
  },
  bookmarkIcon: { fontSize: 16 },
  bookmarkText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: 0.3,
  },
  bookmarkTextActive: { color: tokens.colors.text },
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
    borderBottomColor: tokens.colors.surfaceDark,
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
  shoppingSection: { marginTop: 18 },
  shoppingToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  shoppingToggleText: { fontSize: 13, fontWeight: '800', color: tokens.colors.text, letterSpacing: 0.2 },
  shoppingPanel: {
    marginTop: 12,
    padding: 14,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    gap: 10,
  },
  shoppingPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  shoppingPanelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  shoppingCopyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  shoppingCopyBtnText: { fontSize: 12, fontWeight: '800', color: tokens.colors.textOnDark, letterSpacing: 0.3 },
  shoppingEmpty: { fontSize: 14, color: tokens.colors.textMuted, fontStyle: 'italic' },
  shoppingList: { gap: 8 },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.surfaceDark,
  },
  shoppingItemName: { flex: 1, fontSize: 14, color: tokens.colors.text, fontWeight: '700' },
  shoppingItemQty: { fontSize: 13, color: tokens.colors.text, fontWeight: '600' },
  storiesSection: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: tokens.colors.surfaceDark, gap: 12 },
  storyList: { gap: 10 },
});
