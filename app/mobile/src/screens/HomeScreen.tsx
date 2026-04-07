import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { shadows, tokens } from '../theme';
import { listMockRecipes } from '../mocks/recipes';
import { listMockStories } from '../mocks/stories';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated, logout } = useAuth();
  const [query, setQuery] = useState('');

  const stories = useMemo(() => listMockStories(), []);
  const recipes = useMemo(() => listMockRecipes(), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.heading} accessibilityRole="header">
            Feed
          </Text>
          {isAuthenticated ? (
            <View style={styles.headerRight}>
              <Text style={styles.signedInText} numberOfLines={1}>
                {user ? user.username : 'Signed in'}
              </Text>
              <Pressable
                onPress={() => void logout()}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Text style={styles.link}>Log out</Text>
              </Pressable>
            </View>
          ) : null}
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
            <Text style={styles.sectionHint}>Mock feed</Text>
          </View>
          <FlatList
            data={stories}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('StoryDetail', { id: item.id })}
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
            <Text style={styles.sectionHint}>Mock feed</Text>
          </View>
          <FlatList
            data={recipes}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
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

        {!isAuthenticated ? (
          <View style={styles.authInline}>
            <Text style={styles.authInlineText}>
              Sign in to access author actions like editing.
            </Text>
            <View style={styles.authInlineRow}>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
                accessibilityLabel="Go to Log In"
              >
                <Text style={styles.link}>Log In</Text>
              </Pressable>
              <Text style={styles.authSep}> · </Text>
              <Pressable
                onPress={() => navigation.navigate('Register')}
                accessibilityRole="button"
                accessibilityLabel="Go to Register"
              >
                <Text style={styles.link}>Register</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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
  headerRight: { alignItems: 'flex-end', gap: 6, maxWidth: '55%' },
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
  authInline: {
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.colors.primaryTint,
    alignItems: 'center',
    gap: 8,
  },
  authInlineText: { fontSize: 14, color: tokens.colors.surface, textAlign: 'center' },
  authInlineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  authSep: { fontSize: 15, color: tokens.colors.surface },
  link: { fontSize: 15, color: tokens.colors.surface, fontWeight: '800' },
  signedInText: {
    fontSize: 16,
    color: tokens.colors.surface,
    fontWeight: '700',
  },
});
