import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { apiGetJson } from '../services/httpClient';
import { fetchRecipesList } from '../services/recipeService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

type ListItem = {
  id: number | string;
  title: string;
  region?: string | null;
  author?: { id?: number | string; username?: string } | number | string | null;
};

function authorIdOf(item: ListItem): string | null {
  const a = item.author;
  if (!a) return null;
  if (typeof a === 'object') return a.id != null ? String(a.id) : null;
  return String(a);
}

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId, username } = route.params;
  const userIdStr = String(userId);
  const { user, isAuthenticated } = useAuth();
  const canMessage = isAuthenticated && user != null && String(user.id) !== userIdStr;

  const [recipes, setRecipes] = useState<ListItem[]>([]);
  const [stories, setStories] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [recipeList, storyList] = await Promise.all([
          fetchRecipesList(),
          apiGetJson<ListItem[]>('/api/stories/'),
        ]);
        if (cancelled) return;
        setRecipes(Array.isArray(recipeList) ? recipeList : []);
        setStories(Array.isArray(storyList) ? storyList : []);
      } catch (e) {
        if (!cancelled) {
          setRecipes([]);
          setStories([]);
          setError(e instanceof Error ? e.message : 'Could not load profile.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const myRecipes = useMemo(
    () => recipes.filter((r) => authorIdOf(r) === userIdStr),
    [recipes, userIdStr],
  );
  const myStories = useMemo(
    () => stories.filter((s) => authorIdOf(s) === userIdStr),
    [stories, userIdStr],
  );

  const initial = (username ?? 'U').slice(0, 1).toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading profile…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView message={error} onRetry={() => setReloadToken((t) => t + 1)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <View style={styles.avatar} accessibilityLabel="User avatar">
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.username} accessibilityRole="header">
            {username ?? `User #${userIdStr}`}
          </Text>
        </View>

        {canMessage ? (
          <Pressable
            onPress={() =>
              navigation.navigate('MessageThread', {
                otherUserId: userIdStr,
                otherUsername: username,
              })
            }
            style={({ pressed }) => [styles.messageBtn, pressed && styles.messageBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Message ${username ?? 'this user'}`}
          >
            <Text style={styles.messageBtnText}>
              ✉  Message {username ?? 'this user'}
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>Recipes by {username ?? 'this user'}</Text>
        {myRecipes.length === 0 ? (
          <Text style={styles.muted}>No recipes yet.</Text>
        ) : (
          <View style={styles.list}>
            {myRecipes.map((r) => (
              <Pressable
                key={`r-${r.id}`}
                onPress={() => navigation.navigate('RecipeDetail', { id: String(r.id) })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open recipe ${r.title}`}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                {r.region ? <Text style={styles.rowMeta}>{r.region}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Stories by {username ?? 'this user'}</Text>
        {myStories.length === 0 ? (
          <Text style={styles.muted}>No stories yet.</Text>
        ) : (
          <View style={styles.list}>
            {myStories.map((s) => (
              <Pressable
                key={`s-${s.id}`}
                onPress={() => navigation.navigate('StoryDetail', { id: String(s.id) })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open story ${s.title}`}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {s.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  headerCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
    ...shadows.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: tokens.colors.primarySubtle,
    borderWidth: 2,
    borderColor: tokens.colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: tokens.colors.primary,
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
    flexShrink: 1,
  },
  messageBtn: {
    marginBottom: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    ...shadows.md,
  },
  messageBtnPressed: { opacity: 0.85 },
  messageBtnText: {
    color: tokens.colors.textOnDark,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.surface,
    fontFamily: tokens.typography.display.fontFamily,
  },
  muted: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 18,
  },
  list: { gap: 8, marginBottom: 18 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: tokens.colors.text },
  rowMeta: { marginTop: 4, fontSize: 12, color: tokens.colors.textMuted },
});
