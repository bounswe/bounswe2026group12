import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { shadows, tokens } from '../theme';
import { fetchRecipesList } from '../services/recipeService';
import { apiGetJson } from '../services/httpClient';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');

  const [stories, setStories] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [storyData, recipeData] = await Promise.all([
          apiGetJson<any[]>('/api/stories/'),
          fetchRecipesList(),
        ]);
        if (cancelled) return;
        setStories(Array.isArray(storyData) ? storyData : []);
        setRecipes(Array.isArray(recipeData) ? recipeData : []);
      } catch {
        if (!cancelled) {
          setStories([]);
          setRecipes([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stories</Text>
          </View>
          <FlatList
            data={stories}
            horizontal
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('StoryDetail', { id: String(item.id) })}
                style={({ pressed }) => [styles.storyCard, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open story ${item.title}`}
              >
                {item.thumbnail ? (
                  <View style={styles.storyThumb}>
                    <Image source={{ uri: item.thumbnail }} style={styles.storyThumbImage} resizeMode="cover" />
                  </View>
                ) : (
                  <View style={styles.storyThumb}>
                    <Text style={styles.thumbText}>S</Text>
                  </View>
                )}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.author?.username ? `By ${item.author.username}` : 'Story'}
                </Text>
              </Pressable>
            )}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recipes</Text>
          </View>
          <FlatList
            data={recipes}
            horizontal
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('RecipeDetail', { id: String(item.id) })}
                style={({ pressed }) => [styles.recipeCard, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open recipe ${item.title}`}
              >
                <View style={styles.recipeThumb}>
                  <Text style={styles.thumbText}>R</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {item.region ?? 'Recipe'}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { padding: 16, paddingBottom: 28 },
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
    color: tokens.colors.surface,
    fontFamily: tokens.typography.display.fontFamily,
  },
  searchWrap: { marginBottom: 14 },
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
  sectionTitle: { fontSize: 18, fontWeight: '800', color: tokens.colors.surface },
  sectionHint: { fontSize: 13, color: tokens.colors.primaryTint, fontWeight: '800' },
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
  thumbText: { color: tokens.colors.textOnDark, fontSize: 24, fontWeight: '900' },
  cardTitle: { paddingHorizontal: 12, paddingTop: 10, fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  cardMeta: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 6, fontSize: 13, color: tokens.colors.textMuted },
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
  link: { fontSize: 15, color: tokens.colors.surface, fontWeight: '800' },
});
