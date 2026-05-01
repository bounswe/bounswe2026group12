import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import {
  fetchThreadMessages,
  markThreadRead,
  openThreadWith,
  sendMessage,
  type Message,
} from '../services/messagingService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MessageThread'>;

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageThreadScreen({ route, navigation }: Props) {
  const { threadId: paramThreadId, otherUserId, otherUsername } = route.params;
  const { user, isAuthenticated, isReady } = useAuth();

  const [threadId, setThreadId] = useState<number | null>(
    paramThreadId != null ? Number(paramThreadId) : null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<FlatList<Message>>(null);
  const myId = user?.id != null ? String(user.id) : null;

  useEffect(() => {
    navigation.setOptions({
      title: otherUsername ?? 'Conversation',
    });
  }, [navigation, otherUsername]);

  const ensureThread = useCallback(async (): Promise<number | null> => {
    if (threadId != null) return threadId;
    if (otherUserId == null) {
      setError('Missing recipient.');
      return null;
    }
    const t = await openThreadWith(otherUserId);
    setThreadId(t.id);
    return t.id;
  }, [threadId, otherUserId]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const id = await ensureThread();
      if (id == null) {
        setLoading(false);
        return;
      }
      const list = await fetchThreadMessages(id);
      setMessages(list);
      try {
        await markThreadRead(id);
      } catch {
        // best-effort; ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load conversation.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [ensureThread]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady || !isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      void load();
    }, [isReady, isAuthenticated, load]),
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const id = await ensureThread();
      if (id == null) return;
      const created = await sendMessage(id, text);
      setMessages((prev) => [...prev, created]);
      setDraft('');
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }, [draft, sending, ensureThread]);

  if (!isReady || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading conversation…" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.muted}>Log in to view this conversation.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && messages.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView message={error} onRetry={() => void load()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={
            messages.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.muted}>Say hi — no messages yet.</Text>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = myId != null && String(item.sender) === myId;
            return (
              <View
                style={[
                  styles.bubbleRow,
                  mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleTheirs,
                    item.is_deleted && styles.bubbleDeleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                      item.is_deleted && styles.bubbleTextDeleted,
                    ]}
                  >
                    {item.body}
                  </Text>
                  <Text
                    style={[
                      styles.stamp,
                      mine ? styles.stampMine : styles.stampTheirs,
                    ]}
                  >
                    {formatStamp(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message…"
            placeholderTextColor={tokens.colors.textMuted}
            multiline
            editable={!sending}
            accessibilityLabel="Message input"
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={sending || draft.trim().length === 0}
            style={({ pressed }) => [
              styles.sendBtn,
              (sending || draft.trim().length === 0) && styles.sendBtnDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  listContent: { padding: 16, gap: 8, paddingBottom: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  muted: { fontSize: 14, color: tokens.colors.textMuted, textAlign: 'center' },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    ...shadows.sm,
  },
  bubbleMine: {
    backgroundColor: tokens.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: tokens.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  bubbleDeleted: { opacity: 0.7 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: tokens.colors.text },
  bubbleTextDeleted: { fontStyle: 'italic' },
  stamp: { marginTop: 4, fontSize: 10 },
  stampMine: { color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  stampTheirs: { color: tokens.colors.textMuted },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.bg,
    fontSize: 15,
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: tokens.colors.textOnDark, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.85 },
});
