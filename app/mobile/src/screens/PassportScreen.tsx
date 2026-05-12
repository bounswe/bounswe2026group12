import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
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
import type { RootStackParamList } from '../navigation/types';
import { fetchPassport, type Passport } from '../services/passportService';
import { resolveTheme } from '../utils/passportTheme';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Passport'>;

type TabKey = 'stamps' | 'cultures' | 'map' | 'timeline' | 'quests';

type TabConfig = {
  key: TabKey;
  label: string;
};

const TABS: TabConfig[] = [
  { key: 'stamps', label: 'Stamps' },
  { key: 'cultures', label: 'Cultures' },
  { key: 'map', label: 'Map' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'quests', label: 'Quests' },
];

/**
 * Four stats surfaced in the top bar. Keys mirror what `/api/users/<u>/passport/`
 * actually returns today (probed against prod): `cultures_count`, `recipes_tried`,
 * `stories_saved`, `heritage_shared`. Missing keys fall back to 0 in the service.
 */
const STAT_FIELDS: { key: string; label: string }[] = [
  { key: 'recipes_tried', label: 'Recipes tried' },
  { key: 'stories_saved', label: 'Stories saved' },
  { key: 'cultures_count', label: 'Cultures' },
  { key: 'heritage_shared', label: 'Heritage shared' },
];

export default function PassportScreen({ route }: Props) {
  const { username, isOwn = false } = route.params;

  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('stamps');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPassport(username);
      setPassport(data);
    } catch (e) {
      setPassport(null);
      setError(e instanceof Error ? e.message : 'Could not load passport.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Re-fetch when the screen regains focus so toggling a stamp / quest in a
  // sibling screen reflects on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading passport…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !passport) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView message={error ?? 'Passport unavailable.'} onRetry={() => void load()} />
        </View>
      </SafeAreaView>
    );
  }

  const initial = username.slice(0, 1).toUpperCase();
  const theme = resolveTheme(passport.active_theme, passport.level);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PassportCover
          theme={theme}
          level={passport.level}
          totalPoints={passport.total_points}
          username={username}
        />

        <View style={styles.identityCard}>
          <View style={styles.avatar} accessibilityLabel="Passport holder avatar">
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.username} accessibilityRole="header">
              @{username}
            </Text>
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>
                {isOwn ? 'Own passport' : 'Viewing passport'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsBar} accessibilityRole="summary">
          {STAT_FIELDS.map((field) => {
            const value = passport.stats[field.key] ?? 0;
            return (
              <View key={field.key} style={styles.statCell}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>
                  {field.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.tabBar} accessibilityRole="tablist">
          {TABS.map((tab) => (
            <TabPill
              key={tab.key}
              label={tab.label}
              active={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>

        <View style={styles.tabBody}>
          {activeTab === 'stamps' && <StampCollection stamps={passport.stamps} />}
          {activeTab === 'cultures' && (
            <CultureGrid cultures={passport.culture_summaries} username={username} />
          )}
          {activeTab === 'map' && <PassportWorldMap cultures={passport.culture_summaries} />}
          {activeTab === 'timeline' && (
            <JourneyTimeline username={username} initialEvents={passport.timeline} />
          )}
          {activeTab === 'quests' && <QuestList quests={passport.active_quests} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TabPill({
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
  cover: {
    backgroundColor: tokens.colors.accentGreen,
    borderRadius: tokens.radius.xl,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    padding: 20,
    marginBottom: 18,
    gap: 10,
    ...shadows.lg,
  },
  coverTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: tokens.colors.textOnDark,
    letterSpacing: 1.2,
    fontFamily: tokens.typography.display.fontFamily,
  },
  levelPill: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.accentMustard,
    borderRadius: tokens.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  levelPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  coverTheme: {
    fontSize: 12,
    color: tokens.colors.textOnDark,
    fontStyle: 'italic',
    opacity: 0.85,
  },
  identityCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
    ...shadows.md,
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
  identityText: {
    flexShrink: 1,
    gap: 6,
  },
  username: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  ribbon: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.accentMustard,
    borderRadius: tokens.radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  ribbonText: {
    fontSize: 11,
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: 0.4,
  },
  statsBar: {
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
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: tokens.colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  tabActive: {
    backgroundColor: tokens.colors.accentMustard,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: tokens.colors.text,
  },
  tabBody: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: 18,
    minHeight: 90,
    justifyContent: 'center',
    ...shadows.sm,
  },
  tabBodyText: {
    fontSize: 14,
    color: tokens.colors.text,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pressed: { opacity: 0.85 },
});
