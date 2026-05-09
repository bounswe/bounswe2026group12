import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { shadows, tokens } from '../theme';
import { fetchRecipesList } from '../services/recipeService';
import { fetchStoriesList } from '../services/storyService';
import { fetchDailyCultural } from '../services/dailyCulturalService';
import { fetchRecommendations, type RecommendationItem } from '../services/recommendationsService';
import { DailyCulturalSection } from '../components/home/DailyCulturalSection';
import { RecommendationsRail } from '../components/home/RecommendationsRail';
import { StoryFeatureCard } from '../components/home/StoryFeatureCard';
import { RankReasonBadge } from '../components/personalization/RankReasonBadge';
import type { DailyCulturalCard } from '../mocks/dailyCultural';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');

  const [stories, setStories] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [daily, setDaily] = useState<DailyCulturalCard[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [storyData, recipeData, dailyData, recsData] = await Promise.all([
          fetchStoriesList(),
          fetchRecipesList(),
          fetchDailyCultural(),
          fetchRecommendations('feed', 10).catch(() => [] as RecommendationItem[]),
        ]);
        if (cancelled) return;
        setStories(Array.isArray(storyData) ? storyData : []);
        setRecipes(Array.isArray(recipeData) ? recipeData : []);
        setDaily(Array.isArray(dailyData) ? dailyData : []);
        setRecommendations(Array.isArray(recsData) ? recsData : []);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setStories([]);
          setRecipes([]);
          setDaily([]);
          setRecommendations([]);
          setLoadError(e instanceof Error ? e.message : 'Could not load feed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRecommendationPress = (item: RecommendationItem) => {
    if (item.kind === 'recipe') {
      navigation.navigate('RecipeDetail', { id: item.id });
    } else {
      navigation.navigate('StoryDetail', { id: item.id });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loadError ? (
          <View style={styles.errorBanner} accessibilityLabel="Feed load error">
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}
        <View style={styles.header}>
          <Text style={styles.heading} accessibilityRole="header">
            Search
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search recipes and stories…"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            accessibilityLabel="Search query"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => navigation.navigate('Search', { query: query.trim() })}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Explore')}
          style={({ pressed }) => [styles.exploreEntry, pressed && styles.exploreEntryPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open Explore by event"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.exploreTitle}>Explore by event</Text>
            <Text style={styles.exploreSubtitle}>Wedding, Ramadan, Birthday, and more</Text>
          </View>
          <Text style={styles.exploreArrow}>→</Text>
        </Pressable>

        <DailyCulturalSection items={daily} />

        <RecommendationsRail items={recommendations} onItemPress={onRecommendationPress} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stories</Text>
            <Text style={styles.sectionHint}>Voices from the kitchen</Text>
          </View>
          {stories.length === 0 ? (
            <Text style={styles.emptyHint}>No stories yet. Be the first to share one.</Text>
          ) : (
            <View style={styles.storyList}>
              {stories.map((item) => {
                const authorId =
                  typeof item.author === 'object' && item.author
                    ? item.author.id
                    : item.author;
                const authorUsername =
                  typeof item.author === 'object' && item.author
                    ? item.author.username
                    : item.author_username;
                const linkedRecipeRaw = item.linked_recipe;
                const linkedRecipeId =
                  linkedRecipeRaw == null
                    ? null
                    : typeof linkedRecipeRaw === 'object' && 'id' in linkedRecipeRaw
                      ? String(linkedRecipeRaw.id)
                      : String(linkedRecipeRaw);
                const linkedRecipeTitle =
                  typeof item.recipe_title === 'string'
                    ? item.recipe_title
                    : typeof linkedRecipeRaw === 'object' && linkedRecipeRaw?.title
                      ? String(linkedRecipeRaw.title)
                      : null;
                return (
                  <View key={String(item.id)} style={styles.storyWrap}>
                    <StoryFeatureCard
                      title={item.title}
                      body={item.body}
                      image={item.image}
                      authorUsername={authorUsername ?? null}
                      recipeTitle={linkedRecipeId ? linkedRecipeTitle : null}
                      onPress={() => navigation.navigate('StoryDetail', { id: String(item.id) })}
                      onPressAuthor={
                        authorId != null && authorUsername
                          ? () =>
                              navigation.navigate('UserProfile', {
                                userId: authorId,
                                username: authorUsername,
                              })
                          : undefined
                      }
                      onPressRecipe={
                        linkedRecipeId
                          ? () => navigation.navigate('RecipeDetail', { id: linkedRecipeId })
                          : undefined
                      }
                    />
                    <RankReasonBadge reason={item.rank_reason} style={styles.storyBadge} />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionSubTitle}>More recipes</Text>
          </View>
          <FlatList
            data={recipes}
            horizontal
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => {
              const authorId =
                typeof item.author === 'object' && item.author
                  ? item.author.id
                  : item.author;
              const authorUsername =
                typeof item.author === 'object' && item.author
                  ? item.author.username
                  : item.author_username;
              const regionName =
                typeof item.region === 'object' && item.region
                  ? item.region.name
                  : item.region_name ?? (typeof item.region === 'string' ? item.region : null);
              return (
                <Pressable
                  onPress={() => navigation.navigate('RecipeDetail', { id: String(item.id) })}
                  style={({ pressed }) => [styles.recipeCard, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open recipe ${item.title}`}
                >
                  {item.image ? (
                    <View style={styles.recipeThumb}>
                      <Image
                        source={{ uri: item.image }}
                        style={styles.recipeThumbImage}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View style={styles.recipeThumb}>
                      <Text style={styles.thumbText}>R</Text>
                    </View>
                  )}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {authorId != null && authorUsername ? (
                    <Pressable
                      onPress={() =>
                        navigation.navigate('UserProfile', {
                          userId: authorId,
                          username: authorUsername,
                        })
                      }
                      style={({ pressed }) => [styles.authorPress, pressed && styles.pressed]}
                      accessibilityRole="link"
                      accessibilityLabel={`Open profile of ${authorUsername}`}
                      hitSlop={6}
                    >
                      <Text style={styles.authorLink} numberOfLines={1}>
                        By {authorUsername}
                      </Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>
                      {regionName ?? 'Recipe'}
                    </Text>
                  </View>
                  <RankReasonBadge reason={item.rank_reason} style={styles.recipeBadge} />
                </Pressable>
              );
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { padding: 16, paddingBottom: 28 },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 12,
  },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  searchWrap: { marginBottom: 14 },
  exploreEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    marginBottom: 14,
    ...shadows.md,
  },
  exploreEntryPressed: { opacity: 0.9 },
  exploreTitle: { fontSize: 16, fontWeight: '800', color: tokens.colors.textOnDark },
  exploreSubtitle: { fontSize: 12, color: tokens.colors.textOnDark, marginTop: 2, opacity: 0.85 },
  exploreArrow: { fontSize: 22, fontWeight: '900', color: tokens.colors.textOnDark },
  searchInput: {
    borderWidth: 2,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: tokens.colors.surfaceInput,
    color: tokens.colors.text,
    ...shadows.sm,
  },
  section: { marginTop: 10, marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: tokens.colors.text, fontFamily: tokens.typography.display.fontFamily },
  sectionSubTitle: { fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  sectionHint: { fontSize: 13, color: tokens.colors.primaryTint, fontWeight: '800' },
  storyList: { gap: 14 },
  emptyHint: { fontSize: 13, color: tokens.colors.textMuted, fontStyle: 'italic' },
  hList: { gap: 12, paddingRight: 16 },
  storyCard: {
    width: 180,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    overflow: 'hidden',
    ...shadows.lg,
  },
  recipeCard: {
    width: 200,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    overflow: 'hidden',
    ...shadows.lg,
  },
  pressed: { opacity: 0.9 },
  storyThumb: {
    width: '100%',
    height: 86,
    backgroundColor: tokens.colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyThumbImage: { width: '100%', height: '100%' },
  recipeThumb: {
    width: '100%',
    height: 86,
    backgroundColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeThumbImage: { width: '100%', height: '100%' },
  thumbText: { color: tokens.colors.text, fontSize: 24, fontWeight: '900' },
  cardTitle: { paddingHorizontal: 12, paddingTop: 10, fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  cardMeta: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 6, fontSize: 13, color: tokens.colors.textMuted },
  authorPress: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: tokens.colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  authorLink: { fontSize: 12, color: tokens.colors.text, fontWeight: '800' },
  tag: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: tokens.colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: { fontSize: 12, fontWeight: '800', color: tokens.colors.text },
  link: { fontSize: 15, color: tokens.colors.text, fontWeight: '800' },
  storyWrap: { gap: 6 },
  storyBadge: { marginLeft: 4 },
  recipeBadge: { marginLeft: 12, marginBottom: 12 },
});
