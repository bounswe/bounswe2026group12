import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import { shadows, tokens } from '../theme';
import {
  fetchNotifications,
  markAllRead,
  markAsRead,
  type Notification,
} from '../services/notificationService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

/**
 * Compact relative-time helper. We deliberately avoid pulling in `date-fns` or
 * `dayjs` here — RN bundle size matters and the rules in #760 ask for a tiny
 * inline helper. Output: "now", "Nm", "Nh", "Yesterday", "Nd", or the bare ISO
 * date for anything older than a week.
 */
function timeAgo(iso: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  return iso.slice(0, 10);
}

function iconFor(type: string): string {
  if (type === 'question') return '💬';
  if (type === 'reply') return '↪';
  if (type === 'rating') return '⭐';
  return '❔';
}

export default function NotificationsScreen({ navigation }: Props) {
  const { isAuthenticated, isReady } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(
    async (opts: { isRefresh?: boolean } = {}) => {
      if (!isReady) return;
      if (!isAuthenticated) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (opts.isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await fetchNotifications();
        // Newest first — backend ordering not guaranteed across page joins.
        data.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        setItems(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load notifications.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, isReady],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onMarkAll = async () => {
    if (markingAll) return;
    // Optimistic — flip every row, then ask the server. Rollback on failure.
    const prev = items;
    setItems((curr) => curr.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(true);
    try {
      await markAllRead();
    } catch (e) {
      setItems(prev);
      setError(e instanceof Error ? e.message : 'Could not mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const onPressItem = (n: Notification) => {
    // Optimistic mark-read. We don't await — the navigation is what the user cares about.
    if (!n.is_read) {
      setItems((curr) =>
        curr.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)),
      );
      void markAsRead(n.id).catch(() => {
        // Roll back silently — next refresh will reconcile.
        setItems((curr) =>
          curr.map((it) => (it.id === n.id ? { ...it, is_read: false } : it)),
        );
      });
    }
    // All three types (question, reply, rating) point at a recipe today.
    if (n.recipe != null) {
      navigation.navigate('RecipeDetail', { id: String(n.recipe) });
    }
  };

  const unreadCount = items.reduce((acc, n) => acc + (n.is_read ? 0 : 1), 0);

  if (!isReady || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading notifications…" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Sign in to see notifications</Text>
          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.signInText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <ErrorView message={error} onRetry={() => void load()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {unreadCount > 0 ? (
        <View style={styles.topBar}>
          <Text style={styles.topBarCount}>
            {unreadCount} unread
          </Text>
          <Pressable
            onPress={onMarkAll}
            disabled={markingAll}
            style={({ pressed }) => [
              styles.markAllPill,
              pressed && styles.pressed,
              markingAll && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ isRefresh: true })}
            tintColor={tokens.colors.surfaceDark}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No notifications yet.</Text>
            <Text style={styles.emptyHint}>
              We'll let you know when someone replies to or rates your recipes.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPressItem(item)}
            style={({ pressed }) => [
              styles.row,
              !item.is_read && styles.rowUnread,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Notification: ${item.message}`}
          >
            <Text style={styles.icon}>{iconFor(item.notification_type)}</Text>
            <View style={styles.body}>
              <Text style={styles.message} numberOfLines={3}>
                {item.message}
              </Text>
              <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
            </View>
            {!item.is_read ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    backgroundColor: tokens.colors.bg,
  },
  topBarCount: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  markAllPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: tokens.colors.accentMustard,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.surfaceDark,
  },
  listContainer: { paddingVertical: 8 },
  emptyContainer: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: tokens.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  rowUnread: {
    backgroundColor: 'rgba(212, 168, 48, 0.08)',
  },
  pressed: { opacity: 0.85 },
  icon: { fontSize: 22, lineHeight: 24, width: 26, textAlign: 'center' },
  body: { flex: 1 },
  message: {
    fontSize: 15,
    color: tokens.colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.accentMustard,
    marginTop: 6,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  signInBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: tokens.colors.accentMustard,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.sm,
  },
  signInText: {
    fontSize: 15,
    fontWeight: '800',
    color: tokens.colors.surfaceDark,
  },
});
