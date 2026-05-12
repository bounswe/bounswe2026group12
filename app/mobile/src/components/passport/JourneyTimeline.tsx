import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { tokens } from '../../theme';
import { ErrorView } from '../ui/ErrorView';
import { LoadingView } from '../ui/LoadingView';
import {
  fetchTimeline,
  type TimelineEvent,
} from '../../services/passportTimelineService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RECIPE_ID_KEYS = ['related_recipe', 'recipe_id', 'linked_recipe'] as const;
const STORY_ID_KEYS = ['related_story', 'story_id', 'linked_story'] as const;

/**
 * Coerce an arbitrary payload value into a positive integer id. Accepts
 * either a number or a numeric string — backends have been known to send
 * ids as strings via DRF serializers. Returns `null` for anything we can't
 * confidently turn into a positive int.
 */
function coerceId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

/**
 * Pull recipe + story ids out of an event's payload. Defensive against
 * backend key drift — the wire format has shipped under at least three
 * different names for the same field. Returns the first positive id we
 * find per slot, `null` otherwise.
 */
export function extractRelatedIds(event: TimelineEvent): {
  recipeId: number | null;
  storyId: number | null;
} {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  let recipeId: number | null = null;
  for (const key of RECIPE_ID_KEYS) {
    recipeId = coerceId(payload[key]);
    if (recipeId !== null) break;
  }
  let storyId: number | null = null;
  for (const key of STORY_ID_KEYS) {
    storyId = coerceId(payload[key]);
    if (storyId !== null) break;
  }
  return { recipeId, storyId };
}

/**
 * Server-formatted messages sometimes already embed the link text (e.g.
 * "Tried Recipe #42"). When that's the case we skip rendering our own pill
 * to avoid duplicating the affordance on screen.
 */
function messageMentions(message: string | undefined, kind: 'Recipe' | 'Story'): boolean {
  if (!message) return false;
  return message.includes(`${kind} #`);
}

type Props = {
  username: string;
  /**
   * Bypass the initial fetch entirely. Useful when the parent already has the
   * passport response in hand (e.g. PassportScreen prefetched it) and just
   * wants to mount the list without flashing a spinner. Infinite scroll still
   * works — once the parent-supplied page runs out we fall back to the
   * service's pagination.
   */
  initialEvents?: TimelineEvent[];
};

const ICONS: Record<string, string> = {
  stamp_earned: '🏷',
  recipe_tried: '🍴',
  story_saved: '📖',
  quest_completed: '🏆',
  heritage_shared: '🌍',
  level_up: '⭐',
};

const UNKNOWN_ICON = '✨';

function iconFor(eventType: string): string {
  return ICONS[eventType] ?? UNKNOWN_ICON;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Render a compact "time ago" string without pulling in a date library. The
 * tiers are: `now` (<60s), `Nm`, `Nh`, `Yesterday`, then a static `Mon D`
 * label once we cross 7 days. Anything we can't parse falls back to an empty
 * string rather than `NaN`-ing on screen.
 */
export function formatTimeAgo(input: string, now: Date = new Date()): string {
  if (!input) return '';
  const then = new Date(input);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return '';
  const diff = now.getTime() - ms;
  if (diff < 0) return 'now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d`;
  return `${MONTH_LABELS[then.getMonth()]} ${then.getDate()}`;
}

/**
 * Build a user-readable headline for a single event. The backend already
 * sends a `description` (mapped to `message`) for every choice in
 * `PassportEvent.TYPE_CHOICES`, so this composer is mostly defensive — it
 * only fires when `message` is missing (e.g. an older build or a brand-new
 * event type the server rolled out without filling description).
 */
export function composeTitle(event: TimelineEvent): string {
  if (event.message && event.message.trim()) return event.message;
  const payload = event.payload ?? {};
  const pick = (k: string): string | undefined =>
    typeof payload[k] === 'string' ? (payload[k] as string) : undefined;
  switch (event.event_type) {
    case 'recipe_tried':
      return `Tried ${pick('recipe_title') ?? 'a recipe'}`;
    case 'story_saved':
      return `Saved ${pick('story_title') ?? 'a story'}`;
    case 'stamp_earned':
      return `Earned ${pick('culture') ?? 'a'} stamp`;
    case 'quest_completed':
      return `Completed ${pick('quest_name') ?? 'a quest'}`;
    case 'heritage_shared':
      return `Shared a heritage story`;
    case 'level_up':
      return `Levelled up`;
    default:
      return 'New journey event';
  }
}

type RowProps = {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
};

function TimelineRow({ event, isFirst, isLast }: RowProps) {
  const navigation = useNavigation<Nav>();
  const title = composeTitle(event);
  const time = formatTimeAgo(event.created_at);
  const icon = iconFor(event.event_type);
  const a11y = `${event.event_type.replace(/_/g, ' ')}: ${title}${time ? `, ${time}` : ''}`;
  const { recipeId, storyId } = extractRelatedIds(event);
  const showRecipePill = recipeId !== null && !messageMentions(event.message, 'Recipe');
  const showStoryPill = storyId !== null && !messageMentions(event.message, 'Story');
  return (
    <View style={styles.row} accessible accessibilityLabel={a11y}>
      <View style={styles.rail}>
        <View style={[styles.railLine, isFirst && styles.railLineFirst]} />
        <View style={styles.dot}>
          <Text style={styles.dotIcon}>{icon}</Text>
        </View>
        <View style={[styles.railLine, isLast && styles.railLineLast]} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {(showRecipePill || showStoryPill) ? (
          <View style={styles.pillRow}>
            {showRecipePill && recipeId !== null ? (
              <Pressable
                onPress={() =>
                  navigation.navigate('RecipeDetail', { id: String(recipeId) })
                }
                style={({ pressed }) => [
                  styles.pill,
                  styles.recipePill,
                  pressed && styles.pillPressed,
                ]}
                accessibilityRole="link"
                accessibilityLabel={`Open Recipe ${recipeId}`}
              >
                <Text style={styles.pillText}>{`Recipe #${recipeId} →`}</Text>
              </Pressable>
            ) : null}
            {showStoryPill && storyId !== null ? (
              <Pressable
                onPress={() =>
                  navigation.navigate('StoryDetail', { id: String(storyId) })
                }
                style={({ pressed }) => [
                  styles.pill,
                  styles.storyPill,
                  pressed && styles.pillPressed,
                ]}
                accessibilityRole="link"
                accessibilityLabel={`Open Story ${storyId}`}
              >
                <Text style={styles.pillText}>{`Story #${storyId} →`}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
    </View>
  );
}

export function JourneyTimeline({ username, initialEvents }: Props) {
  const seedEvents = useMemo(() => initialEvents ?? [], [initialEvents]);

  const [events, setEvents] = useState<TimelineEvent[]>(seedEvents);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(
    initialEvents !== undefined ? false : true,
  );
  const [loading, setLoading] = useState<boolean>(initialEvents === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against firing a second `onEndReached` while one is in flight —
  // FlatList likes to fire it twice during fast scrolls.
  const loadingMoreRef = useRef(false);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchTimeline(username);
      setEvents(page.events);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (initialEvents !== undefined) return;
    void loadFirstPage();
  }, [initialEvents, loadFirstPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const page = await fetchTimeline(username);
      setEvents(page.events);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh timeline');
    } finally {
      setRefreshing(false);
    }
  }, [username]);

  const onEndReached = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!hasMore) return;
    if (!cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchTimeline(username, { cursor });
      setEvents((prev) => [...prev, ...page.events]);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } catch {
      // Soft-fail pagination: keep the existing list, drop hasMore so we don't
      // hammer the failing endpoint on every scroll wiggle.
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [cursor, hasMore, username]);

  if (loading && events.length === 0) {
    return <LoadingView message="Loading journey…" />;
  }

  if (error && events.length === 0) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          void loadFirstPage();
        }}
      />
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.empty} accessibilityLabel="Empty journey">
        <Text style={styles.emptyTitle}>No journey events yet.</Text>
        <Text style={styles.emptyBody}>
          Start exploring recipes and cultures to fill your passport.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item, index }) => (
        <TimelineRow
          event={item}
          isFirst={index === 0}
          isLast={index === events.length - 1}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void onRefresh();
          }}
          tintColor={tokens.colors.surfaceDark}
        />
      }
      onEndReached={() => {
        void onEndReached();
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <LoadingView message="Loading more…" />
          </View>
        ) : error ? (
          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                void onEndReached();
              }}
            >
              <Text style={styles.footerError}>Couldn't load more — tap to retry</Text>
            </Pressable>
          </View>
        ) : null
      }
      contentContainerStyle={styles.list}
    />
  );
}

const RAIL_WIDTH = 32;
const DOT_SIZE = 28;

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 12,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: tokens.colors.primaryBorder,
  },
  railLineFirst: {
    backgroundColor: 'transparent',
  },
  railLineLast: {
    backgroundColor: 'transparent',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: tokens.colors.primaryTint,
    borderWidth: 1,
    borderColor: tokens.colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotIcon: {
    fontSize: 14,
  },
  body: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 12,
  },
  title: {
    fontSize: 15,
    color: tokens.colors.text,
    fontWeight: '600',
  },
  time: {
    marginTop: 2,
    fontSize: 12,
    color: tokens.colors.textMuted,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  recipePill: {
    backgroundColor: tokens.colors.accentMustard,
  },
  storyPill: {
    backgroundColor: tokens.colors.accentGreen,
  },
  pillPressed: {
    opacity: 0.75,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  empty: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 12,
  },
  footerError: {
    fontSize: 13,
    color: tokens.colors.error,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
