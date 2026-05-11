import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  deleteComment,
  fetchCommentsForRecipe,
  postComment,
  toggleCommentVote,
  type Comment,
  type CommentType,
} from '../../services/commentService';
import { shadows, tokens } from '../../theme';

type Props = {
  recipeId: string | number;
  qaEnabled: boolean;
};

type ThreadNode = Comment & { replies: ThreadNode[] };

function buildThread(flat: Comment[]): ThreadNode[] {
  const byId = new Map<number, ThreadNode>();
  flat.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: ThreadNode[] = [];
  flat.forEach((c) => {
    const node = byId.get(c.id)!;
    if (c.parent_comment != null && byId.has(c.parent_comment)) {
      byId.get(c.parent_comment)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export function RecipeCommentsSection({ recipeId, qaEnabled }: Props) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [draftType, setDraftType] = useState<CommentType>('COMMENT');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [votePendingIds, setVotePendingIds] = useState<number[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCommentsForRecipe(recipeId);
      setComments(data);
    } catch (e) {
      setComments([]);
      setLoadError(e instanceof Error ? e.message : 'Could not load comments.');
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tree = useMemo(() => buildThread(comments), [comments]);

  const onSubmit = async () => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setPostError(null);
    try {
      const finalType: CommentType = !qaEnabled ? 'COMMENT' : draftType;
      await postComment(recipeId, body, finalType, replyTo);
      setDraft('');
      setReplyTo(null);
      await reload();
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Could not post.');
    } finally {
      setPosting(false);
    }
  };

  const onDelete = (id: number) => {
    Alert.alert('Delete', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(id);
            // Only drop the target comment. The backend doesn't cascade to
            // replies, so removing them from local state too would create a
            // mirage — they'd vanish from the UI and reappear on the next
            // reload. Replies remain visible (orphaned) until backend cascade
            // lands or they're individually deleted.
            setComments((prev) => prev.filter((c) => c.id !== id));
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : 'Try again.');
          }
        },
      },
    ]);
  };

  const onToggleVote = async (id: number) => {
    if (votePendingIds.includes(id)) return;
    const target = comments.find((c) => c.id === id);
    if (!target) return;
    const nextHasVoted = !target.has_voted;
    const nextCount = Math.max(0, target.helpful_count + (nextHasVoted ? 1 : -1));
    setVotePendingIds((prev) => [...prev, id]);
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, has_voted: nextHasVoted, helpful_count: nextCount } : c)),
    );
    try {
      await toggleCommentVote(id);
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, has_voted: target.has_voted, helpful_count: target.helpful_count } : c,
        ),
      );
      showToast('Could not save your vote. Please try again.', 'error');
    } finally {
      setVotePendingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const myUserId = user?.id != null ? Number(user.id) : null;
  const replyTarget = replyTo != null ? comments.find((c) => c.id === replyTo) ?? null : null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Q&amp;A and Comments</Text>
      {!qaEnabled ? (
        <Text style={styles.qaHint}>Q&amp;A is disabled by the author. Comments only.</Text>
      ) : null}

      {isAuthenticated ? (
        <View style={styles.composer}>
          {qaEnabled ? (
            <View style={styles.typeRow} accessibilityRole="tablist">
              <Pressable
                onPress={() => setDraftType('COMMENT')}
                style={[styles.typeBtn, draftType === 'COMMENT' && styles.typeBtnActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: draftType === 'COMMENT' }}
              >
                <Text style={[styles.typeText, draftType === 'COMMENT' && styles.typeTextActive]}>
                  Comment
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDraftType('QUESTION')}
                style={[styles.typeBtn, draftType === 'QUESTION' && styles.typeBtnActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: draftType === 'QUESTION' }}
              >
                <Text style={[styles.typeText, draftType === 'QUESTION' && styles.typeTextActive]}>
                  Question
                </Text>
              </Pressable>
            </View>
          ) : null}
          {replyTarget ? (
            <View style={styles.replyBanner}>
              <View style={styles.replyBannerHeader}>
                <Text style={styles.replyBannerText} numberOfLines={1}>
                  Replying to {replyTarget.author_username}
                </Text>
                <Pressable
                  onPress={() => setReplyTo(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                >
                  <Text style={styles.replyBannerCancel}>Cancel</Text>
                </Pressable>
              </View>
              {replyTarget.body ? (
                <Text style={styles.replyBannerBody} numberOfLines={2}>
                  {replyTarget.body}
                </Text>
              ) : null}
            </View>
          ) : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={
              replyTarget
                ? 'Write a reply…'
                : draftType === 'QUESTION'
                  ? 'Ask a question about this recipe…'
                  : 'Share a comment…'
            }
            placeholderTextColor="#94a3b8"
            multiline
            style={styles.input}
            accessibilityLabel="Comment input"
            editable={!posting}
          />
          {postError ? <Text style={styles.errorText}>{postError}</Text> : null}
          <Pressable
            onPress={onSubmit}
            disabled={posting || !draft.trim()}
            style={({ pressed }) => [
              styles.submitBtn,
              (posting || !draft.trim()) && styles.submitBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Submit comment"
          >
            <Text style={styles.submitText}>{posting ? 'Posting…' : 'Post'}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.signInHint}>Sign in to comment.</Text>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.colors.surfaceDark} />
        </View>
      ) : loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable onPress={() => void reload()} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : tree.length === 0 ? (
        <Text style={styles.emptyText}>No comments yet. Be the first.</Text>
      ) : (
        <View style={styles.list}>
          {tree.map((node) => (
            <CommentNodeView
              key={node.id}
              node={node}
              myUserId={myUserId}
              onReply={(id) => setReplyTo(id)}
              onDelete={onDelete}
              onToggleVote={onToggleVote}
              isVotePending={(id) => votePendingIds.includes(id)}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CommentNodeView({
  node,
  myUserId,
  onReply,
  onDelete,
  onToggleVote,
  isVotePending,
  isAuthenticated,
  depth = 0,
}: {
  node: ThreadNode;
  myUserId: number | null;
  onReply: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleVote: (id: number) => void;
  isVotePending: (id: number) => boolean;
  isAuthenticated: boolean;
  depth?: number;
}) {
  const canDelete = myUserId != null && myUserId === node.author;
  const votePending = isVotePending(node.id);
  return (
    <View style={[styles.commentItem, depth > 0 && styles.commentItemReply]}>
      <View style={styles.commentHeader}>
        <Text style={styles.author}>{node.author_username}</Text>
        {node.type === 'QUESTION' ? (
          <View style={styles.qBadge}>
            <Text style={styles.qBadgeText}>Question</Text>
          </View>
        ) : null}
        <Text style={styles.timestamp}>{formatTime(node.created_at)}</Text>
      </View>
      <Text style={styles.body}>{node.body}</Text>
      <View style={styles.feedbackRow}>
        <Pressable
          onPress={() => onToggleVote(node.id)}
          disabled={!isAuthenticated || votePending}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityState={{ selected: node.has_voted, disabled: !isAuthenticated || votePending }}
          accessibilityLabel={node.has_voted ? 'Unmark helpful' : 'Mark helpful'}
          style={({ pressed }) => [
            styles.helpfulBtn,
            node.has_voted && styles.helpfulBtnActive,
            (!isAuthenticated || votePending) && styles.helpfulBtnDisabled,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.helpfulText, node.has_voted && styles.helpfulTextActive]}>
            {votePending ? 'Updating…' : node.has_voted ? 'Helpful' : 'Mark Helpful'}
          </Text>
        </Pressable>
        <Text style={styles.helpfulCount}>Helpful: {node.helpful_count}</Text>
      </View>
      <View style={styles.actions}>
        {isAuthenticated && depth === 0 ? (
          <Pressable
            onPress={() => onReply(node.id)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Reply to ${node.author_username}`}
          >
            <Text style={styles.actionText}>Reply</Text>
          </Pressable>
        ) : null}
        {canDelete ? (
          <Pressable
            onPress={() => onDelete(node.id)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Delete comment"
          >
            <Text style={[styles.actionText, styles.destructive]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
      {node.replies.length > 0 ? (
        <View style={styles.repliesWrap}>
          {node.replies.map((r) => (
            <CommentNodeView
              key={r.id}
              node={r}
              myUserId={myUserId}
              onReply={onReply}
              onDelete={onDelete}
              onToggleVote={onToggleVote}
              isVotePending={isVotePending}
              isAuthenticated={isAuthenticated}
              depth={depth + 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: tokens.colors.surfaceDark, gap: 12 },
  heading: { fontSize: 18, fontWeight: '800', color: tokens.colors.text, fontFamily: tokens.typography.display.fontFamily },
  qaHint: { fontSize: 13, color: tokens.colors.textMuted, fontStyle: 'italic' },
  composer: {
    gap: 10,
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceInput,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...shadows.sm,
  },
  typeRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
  },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  typeBtnActive: { backgroundColor: tokens.colors.accentGreen },
  typeText: { fontSize: 13, fontWeight: '700', color: tokens.colors.text },
  typeTextActive: { color: tokens.colors.textOnDark },
  replyBanner: {
    padding: 10,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bg,
    borderLeftWidth: 4,
    borderLeftColor: tokens.colors.surfaceDark,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: tokens.colors.surfaceDark,
    borderRightColor: tokens.colors.surfaceDark,
    borderBottomColor: tokens.colors.surfaceDark,
    gap: 6,
  },
  replyBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  replyBannerText: { flex: 1, fontSize: 13, fontWeight: '800', color: tokens.colors.text },
  replyBannerCancel: { fontSize: 13, fontWeight: '800', color: tokens.colors.text, marginLeft: 8, textDecorationLine: 'underline' },
  replyBannerBody: { fontSize: 13, color: tokens.colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  input: {
    minHeight: 70,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.text,
    textAlignVertical: 'top',
  },
  submitBtn: {
    alignSelf: 'flex-end',
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.pill,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: tokens.colors.textOnDark, fontWeight: '800', fontSize: 14 },
  signInHint: { fontSize: 14, color: tokens.colors.textMuted, fontStyle: 'italic' },
  errorBanner: { gap: 6, paddingVertical: 8 },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '700' },
  retryText: { color: tokens.colors.text, fontWeight: '800', textDecorationLine: 'underline' },
  emptyText: { fontSize: 14, color: tokens.colors.textMuted, fontStyle: 'italic' },
  centered: { paddingVertical: 16, alignItems: 'center' },
  list: { gap: 12 },
  commentItem: {
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 6,
  },
  commentItemReply: {
    backgroundColor: tokens.colors.surfaceInput,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  author: { fontSize: 14, fontWeight: '800', color: tokens.colors.text },
  qBadge: {
    backgroundColor: tokens.colors.accentGreen,
    borderRadius: tokens.radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  qBadgeText: { fontSize: 11, fontWeight: '800', color: tokens.colors.textOnDark },
  timestamp: { fontSize: 12, color: tokens.colors.textMuted, marginLeft: 'auto' },
  body: { fontSize: 15, color: tokens.colors.text, lineHeight: 22 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  helpfulBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: tokens.colors.accentMustard,
  },
  helpfulBtnActive: {
    backgroundColor: tokens.colors.accentGreen,
    borderColor: '#000000',
  },
  helpfulBtnDisabled: { opacity: 0.6 },
  helpfulText: { fontSize: 13, fontWeight: '800', color: '#000000' },
  helpfulTextActive: { color: '#FAF7EF' },
  helpfulCount: { fontSize: 13, fontWeight: '700', color: tokens.colors.surfaceDark },
  actions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
    textDecorationLine: 'underline',
  },
  destructive: { color: '#991b1b' },
  repliesWrap: { marginTop: 10, marginLeft: 16, gap: 10 },
});
