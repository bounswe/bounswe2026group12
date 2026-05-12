import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import {
  fetchBookmarkedRecipes,
  type BookmarkedRecipeListItem,
} from '../services/bookmarkService';
import { fetchRecipesList } from '../services/recipeService';
import { fetchStoriesList } from '../services/storyService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

type ListItem = {
  id: number | string;
  title: string;
  region?: string | null;
  author?: { id?: number | string; username?: string } | number | string | null;
};

type TabKey = 'recipes' | 'stories' | 'saved';

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId, username } = route.params;
  const userIdStr = String(userId);
  const { user, isAuthenticated } = useAuth();
  const canMessage = isAuthenticated && user != null && String(user.id) !== userIdStr;
  /** Saved tab is private — only render it when viewing your own profile. */
  const isOwnProfile = isAuthenticated && user != null && String(user.id) === userIdStr;

  const [recipes, setRecipes] = useState<ListItem[]>([]);
  const [stories, setStories] = useState<ListItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<BookmarkedRecipeListItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('recipes');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        // Backend `?author=<id>` filter (#637) lets us pull only this user's
        // content instead of fetching everything and filtering client-side
        // — which used to silently miss anyone past page 1 (#619).
        const [recipeList, storyList] = await Promise.all([
          fetchRecipesList({ author: userIdStr }),
          fetchStoriesList({ author: userIdStr }),
        ]);
        if (cancelled) return;
        setRecipes(Array.isArray(recipeList) ? recipeList : []);
        setStories(Array.isArray(storyList) ? (storyList as ListItem[]) : []);
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
  }, [userIdStr, reloadToken]);

  const loadSaved = useCallback(async () => {
    if (!isOwnProfile) return;
    setSavedLoading(true);
    setSavedError(null);
    try {
      const items = await fetchBookmarkedRecipes();
      setSavedRecipes(items);
    } catch (e) {
      setSavedRecipes([]);
      setSavedError(e instanceof Error ? e.message : 'Could not load saved recipes.');
    } finally {
      setSavedLoading(false);
    }
  }, [isOwnProfile]);

  // Refresh saved recipes when this screen regains focus — so toggling a
  // bookmark on a detail screen and tapping back shows the up-to-date list.
  useFocusEffect(
    useCallback(() => {
      if (isOwnProfile && activeTab === 'saved') {
        void loadSaved();
      }
    }, [isOwnProfile, activeTab, loadSaved]),
  );

  // Initial fetch when the user first opens the Saved tab.
  useEffect(() => {
    if (isOwnProfile && activeTab === 'saved' && savedRecipes.length === 0 && !savedLoading && !savedError) {
      void loadSaved();
    }
  }, [isOwnProfile, activeTab, savedRecipes.length, savedLoading, savedError, loadSaved]);

  const myRecipes = recipes;
  const myStories = stories;

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

        <View style={styles.tabBar} accessibilityRole="tablist">
          <TabButton
            label={`Recipes (${myRecipes.length})`}
            active={activeTab === 'recipes'}
            onPress={() => setActiveTab('recipes')}
          />
          <TabButton
            label={`Stories (${myStories.length})`}
            active={activeTab === 'stories'}
            onPress={() => setActiveTab('stories')}
          />
          {isOwnProfile ? (
            <TabButton
              label="Saved"
              active={activeTab === 'saved'}
              onPress={() => setActiveTab('saved')}
            />
          ) : null}
        </View>

        {activeTab === 'recipes' ? (
          myRecipes.length === 0 ? (
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
          )
        ) : null}

        {activeTab === 'stories' ? (
          myStories.length === 0 ? (
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
          )
        ) : null}

        {activeTab === 'saved' && isOwnProfile ? (
          savedLoading ? (
            <View style={styles.savedCentered}>
              <LoadingView message="Loading saved recipes…" />
            </View>
          ) : savedError ? (
            <ErrorView message={savedError} onRetry={() => void loadSaved()} />
          ) : savedRecipes.length === 0 ? (
            <Text style={styles.muted}>You haven&apos;t saved any recipes yet.</Text>
          ) : (
            <View style={styles.list}>
              {savedRecipes.map((r) => (
                <Pressable
                  key={`saved-${r.id}`}
                  onPress={() => navigation.navigate('RecipeDetail', { id: String(r.id) })}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open saved recipe ${r.title}`}
                >
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text style={styles.rowBookmark} accessibilityLabel="Bookmarked">
                      🔖
                    </Text>
                  </View>
                  {r.region ? <Text style={styles.rowMeta}>{r.region}</Text> : null}
                </Pressable>
              ))}
            </View>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.pressed,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
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
    backgroundColor: tokens.colors.accentGreenTint,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: tokens.colors.text,
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
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  tabActive: {
    backgroundColor: tokens.colors.accentGreen,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: 0.2,
  },
  tabTextActive: { color: tokens.colors.textOnDark },
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
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowBookmark: { fontSize: 14 },
  pressed: { opacity: 0.85 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: tokens.colors.text, flexShrink: 1 },
  rowMeta: { marginTop: 4, fontSize: 12, color: tokens.colors.textMuted },
  savedCentered: { paddingVertical: 24, alignItems: 'center' },
});
