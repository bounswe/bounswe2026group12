import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CultureGrid } from '../components/passport/CultureGrid';
import { JourneyTimeline } from '../components/passport/JourneyTimeline';
import { PassportCover } from '../components/passport/PassportCover';
import { PassportWorldMap } from '../components/passport/PassportWorldMap';
import { QuestList } from '../components/passport/QuestList';
import { StampCollection } from '../components/passport/StampCollection';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import {
  fetchBookmarkedRecipes,
  type BookmarkedRecipeListItem,
} from '../services/bookmarkService';
import { fetchPassport, type Passport } from '../services/passportService';
import {
  fetchPublicProfile,
  type PublicUserProfile,
} from '../services/profileService';
import { fetchRecipesList } from '../services/recipeService';
import { fetchStoriesList } from '../services/storyService';
import { resolveTheme } from '../utils/passportTheme';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

type ListItem = {
  id: number | string;
  title: string;
  region?: string | null;
  author?: { id?: number | string; username?: string } | number | string | null;
};

type TabKey = 'recipes' | 'stories' | 'saved';

type PassportTabKey = 'stamps' | 'cultures' | 'map' | 'timeline' | 'quests';

const PASSPORT_TABS: { key: PassportTabKey; label: string }[] = [
  { key: 'stamps', label: 'Stamps' },
  { key: 'cultures', label: 'Cultures' },
  { key: 'map', label: 'Map' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'quests', label: 'Quests' },
];

/**
 * Stats order matches web `PassportStatsBar.jsx`: Cultures, Recipes Tried,
 * Stories, Heritage; level badge is rendered as the fifth cell.
 */
const PASSPORT_STAT_FIELDS: { key: string; label: string }[] = [
  { key: 'cultures_count', label: 'Cultures' },
  { key: 'recipes_tried', label: 'Recipes Tried' },
  { key: 'stories_saved', label: 'Stories' },
  { key: 'heritage_shared', label: 'Heritage' },
];

const PASSPORT_LEVEL_TITLES: Record<number, string> = {
  1: 'Bronze Explorer',
  2: 'Silver Wanderer',
  3: 'Gold Traveler',
  4: 'Emerald Voyager',
  5: 'Legendary Master',
  6: 'World Kitchen Master',
};

function passportLevelTitle(level: number, apiLevelName?: string): string {
  const titled = PASSPORT_LEVEL_TITLES[level];
  if (titled) return titled;
  const fromApi = apiLevelName?.trim();
  if (fromApi) return fromApi;
  return `Level ${level}`;
}

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

  // Passport state — fetched inline on screen focus, mirroring the (now removed)
  // standalone PassportScreen behavior so toggling a stamp/quest elsewhere
  // reflects on return. See #831.
  const [passport, setPassport] = useState<Passport | null>(null);
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [activePassportTab, setActivePassportTab] = useState<PassportTabKey>('stamps');

  // Public profile (#874): bio, region, join date, stats, preference tags.
  // Failures here must not break the rest of the screen — we simply skip the
  // rich header section. The legacy fetches above stay independent.
  const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);

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

  const loadPassport = useCallback(async () => {
    if (!username) {
      setPassport(null);
      setPassportLoading(false);
      setPassportError(null);
      return;
    }
    setPassportLoading(true);
    setPassportError(null);
    try {
      const data = await fetchPassport(username);
      setPassport(data);
    } catch (e) {
      setPassport(null);
      setPassportError(e instanceof Error ? e.message : 'Could not load passport.');
    } finally {
      setPassportLoading(false);
    }
  }, [username]);

  // Refetch passport whenever this screen regains focus, so changes made on
  // sibling screens (stamp toggles, quest completions) reflect on return.
  useFocusEffect(
    useCallback(() => {
      void loadPassport();
    }, [loadPassport]),
  );

  // Fetch the public profile by username. Don't block the screen on failure —
  // we just skip the rich header if it errors.
  useEffect(() => {
    let cancelled = false;
    if (!username) {
      setPublicProfile(null);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        const data = await fetchPublicProfile(username);
        if (!cancelled) setPublicProfile(data);
      } catch {
        if (!cancelled) setPublicProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, reloadToken]);

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
      <ScrollView
        contentContainerStyle={styles.scroll}
        /** Map + markers need taps; parent scroll steals them on Android when enabled. */
        scrollEnabled={activePassportTab !== 'map'}
        nestedScrollEnabled
      >
        <View style={styles.headerCard}>
          <View style={styles.avatar} accessibilityLabel="User avatar">
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.headerIdentity}>
            <Text style={styles.username} accessibilityRole="header">
              {username ?? `User #${userIdStr}`}
            </Text>
            {publicProfile?.region ? (
              <View style={styles.regionPill} accessibilityLabel={`Region ${publicProfile.region}`}>
                <Text style={styles.regionPillText} numberOfLines={1}>
                  {`\u{1F4CD} ${publicProfile.region}`}
                </Text>
              </View>
            ) : null}
            {publicProfile?.created_at ? (
              <Text style={styles.joinedText}>
                {`Joined ${new Date(publicProfile.created_at).getFullYear()}`}
              </Text>
            ) : null}
          </View>
        </View>

        {publicProfile ? (
          <View style={styles.infoCard}>
            {publicProfile.bio ? (
              <Text style={styles.bioText}>{publicProfile.bio}</Text>
            ) : null}
            <Text style={styles.statsText} accessibilityLabel="Profile stats">
              {`${publicProfile.recipe_count ?? 0} recipes · ${publicProfile.story_count ?? 0} stories`}
            </Text>
            <TagSection label="Cultural Interests" values={publicProfile.cultural_interests} />
            <TagSection label="Dietary Preferences" values={publicProfile.religious_preferences} />
            <TagSection label="Event Interests" values={publicProfile.event_interests} />
            {isOwnProfile ? (
              <Pressable
                onPress={() => navigation.navigate('EditProfile')}
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <Text style={styles.editBtnText}>{'✏️  Edit profile'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : isOwnProfile ? (
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            style={({ pressed }) => [styles.editBtnStandalone, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Text style={styles.editBtnText}>{'✏️  Edit profile'}</Text>
          </Pressable>
        ) : null}

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

        {username ? (
          <View style={styles.passportSection}>
            <Text style={styles.passportSectionTitle} accessibilityRole="header">
              Cultural passport
            </Text>
            {passportLoading ? (
              <View style={styles.passportCentered}>
                <LoadingView message="Loading passport…" />
              </View>
            ) : passportError || !passport ? (
              <ErrorView
                message={passportError ?? 'Passport unavailable.'}
                onRetry={() => void loadPassport()}
              />
            ) : (
              <>
                <PassportCover
                  theme={resolveTheme(passport.active_theme, passport.level)}
                  level={passport.level}
                  totalPoints={passport.total_points}
                  username={username}
                />
                <View style={styles.passportStatsBar} accessibilityRole="summary">
                  {PASSPORT_STAT_FIELDS.map((field) => {
                    const value = passport.stats[field.key] ?? 0;
                    return (
                      <View key={field.key} style={styles.passportStatCell}>
                        <Text style={styles.passportStatValue}>{value}</Text>
                        <Text style={styles.passportStatLabel} numberOfLines={2}>
                          {field.label}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={styles.passportStatCellLevel} accessibilityLabel="Passport level">
                    <Text style={styles.passportLevelName} numberOfLines={3}>
                      {passportLevelTitle(passport.level, passport.stats_level_name)}
                    </Text>
                  </View>
                </View>
                <View style={styles.tabBar} accessibilityRole="tablist">
                  {PASSPORT_TABS.map((tab) => (
                    <TabButton
                      key={tab.key}
                      label={tab.label}
                      active={activePassportTab === tab.key}
                      onPress={() => setActivePassportTab(tab.key)}
                    />
                  ))}
                </View>
                <View style={styles.passportTabBody}>
                  {activePassportTab === 'stamps' && (
                    <StampCollection stamps={passport.stamps} />
                  )}
                  {activePassportTab === 'cultures' && (
                    <CultureGrid
                      cultures={passport.culture_summaries}
                      username={username}
                    />
                  )}
                  {activePassportTab === 'map' && (
                    <PassportWorldMap
                      cultures={passport.culture_summaries}
                      stamps={passport.stamps}
                    />
                  )}
                  {activePassportTab === 'timeline' && (
                    <JourneyTimeline
                      username={username}
                      initialEvents={passport.timeline}
                      embeddedInParentScroll
                    />
                  )}
                  {activePassportTab === 'quests' && (
                    <QuestList quests={passport.active_quests} />
                  )}
                </View>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TagSection({
  label,
  values,
}: {
  label: string;
  values?: string[] | null;
}) {
  if (!values || values.length === 0) return null;
  return (
    <View style={styles.tagSection} accessibilityLabel={label}>
      <Text style={styles.tagSectionTitle}>{label}</Text>
      <View style={styles.tagRow}>
        {values.map((v) => (
          <View key={`${label}-${v}`} style={styles.tagPill}>
            <Text style={styles.tagPillText} numberOfLines={1}>
              {v}
            </Text>
          </View>
        ))}
      </View>
    </View>
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
  headerIdentity: { flex: 1, minWidth: 0, gap: 6 },
  regionPill: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.accentGreenTint,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  regionPillText: { fontSize: 12, fontWeight: '700', color: tokens.colors.text },
  joinedText: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: '600' },
  infoCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    padding: 16,
    marginBottom: 22,
    gap: 12,
    ...shadows.md,
  },
  bioText: { fontSize: 15, color: tokens.colors.text, lineHeight: 21 },
  statsText: { fontSize: 13, fontWeight: '700', color: tokens.colors.textMuted },
  tagSection: { gap: 6 },
  tagSectionTitle: { fontSize: 13, fontWeight: '800', color: tokens.colors.text, letterSpacing: 0.3 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: {
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagPillText: { fontSize: 12, fontWeight: '700', color: tokens.colors.text },
  editBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.sm,
  },
  editBtnStandalone: {
    alignSelf: 'flex-start',
    marginBottom: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.sm,
  },
  editBtnText: {
    color: tokens.colors.textOnDark,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  passportSection: {
    marginTop: 8,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  passportSectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
    marginBottom: 14,
  },
  passportCentered: { paddingVertical: 24, alignItems: 'center' },
  passportStatsBar: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 18,
    ...shadows.sm,
  },
  passportStatCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 2,
    minWidth: 0,
  },
  passportStatCellLevel: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginLeft: 2,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accentGreenTint,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    minWidth: 0,
  },
  passportLevelName: {
    fontSize: 11,
    fontWeight: '800',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  passportStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: tokens.colors.text,
  },
  passportStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  passportTabBody: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: 18,
    minHeight: 90,
    justifyContent: 'center',
    ...shadows.sm,
  },
});
