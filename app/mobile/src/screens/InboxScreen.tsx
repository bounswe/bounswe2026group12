import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { fetchInbox, type ThreadSummary } from '../services/messagingService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'>;

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString();
}

export default function InboxScreen({ navigation }: Props) {
  const { isAuthenticated, isReady } = useAuth();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      const list = await fetchInbox();
      setThreads(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages.');
      setThreads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      void load('initial');
    }, [isReady, isAuthenticated, load]),
  );

  if (!isReady || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading messages…" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.muted}>Log in to see your messages.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView message={error} onRetry={() => void load('initial')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={threads}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={
          threads.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />
        }
        ListEmptyComponent={
          <View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.muted}>
              Open a recipe and tap an author to start a conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('MessageThread', {
                threadId: item.id,
                otherUserId: item.other_user_id ?? undefined,
                otherUsername: item.other_username ?? undefined,
              })
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open conversation with ${item.other_username ?? 'user'}`}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.other_username ?? `User #${item.other_user_id ?? '?'}`}
              </Text>
              <Text style={styles.rowTime}>{formatTime(item.last_message_at)}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text
                style={[styles.preview, item.unread_count > 0 && styles.previewUnread]}
                numberOfLines={1}
              >
                {item.last_message_preview || 'No messages yet'}
              </Text>
              {item.unread_count > 0 ? (
                <View style={styles.badge} accessibilityLabel={`${item.unread_count} unread`}>
                  <Text style={styles.badgeText}>{item.unread_count}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: tokens.typography.display.fontFamily,
  },
  muted: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    gap: 6,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: tokens.colors.text, flexShrink: 1 },
  rowTime: { fontSize: 12, color: tokens.colors.textMuted },
  rowBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 14, color: tokens.colors.textMuted },
  previewUnread: { color: tokens.colors.text, fontWeight: '700' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: tokens.colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: tokens.colors.textOnDark, fontSize: 12, fontWeight: '800' },
});
