import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  safe: { flex: 1, backgroundColor: '#fff' },
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
    color: '#0f172a',
  },
  searchWrap: { marginBottom: 14 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  section: { marginTop: 10, marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionHint: { fontSize: 13, color: '#94a3b8', fontWeight: '700' },
  hList: { gap: 12, paddingRight: 16 },
  storyCard: {
    width: 180,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  recipeCard: {
    width: 200,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  storyThumb: {
    width: '100%',
    height: 86,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyThumbImage: { width: '100%', height: '100%' },
  recipeThumb: {
    width: '100%',
    height: 86,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  cardTitle: { paddingHorizontal: 12, paddingTop: 10, fontSize: 15, fontWeight: '800', color: '#0f172a' },
  cardMeta: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 6, fontSize: 13, color: '#64748b' },
  tag: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  authInline: {
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    gap: 8,
  },
  authInlineText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  authInlineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  authSep: { fontSize: 15, color: '#94a3b8' },
  link: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  signedInText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '700',
  },
});
