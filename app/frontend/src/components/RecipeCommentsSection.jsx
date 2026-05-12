import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteComment,
  fetchCommentsForRecipe,
  postComment,
  toggleCommentVote,
} from '../services/commentService';
import './RecipeCommentsSection.css';

function buildThreads(comments) {
  const byId = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] }]));
  const roots = [];
  comments.forEach((comment) => {
    const current = byId.get(comment.id);
    if (comment.parentComment && byId.has(comment.parentComment)) {
      byId.get(comment.parentComment).replies.push(current);
    } else {
      roots.push(current);
    }
  });
  return roots;
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Composer({
  qaEnabled, isAuthenticated, replyTarget, onCancelReply, onSubmit, submitting,
}) {
  const [body, setBody] = useState('');
  const [type, setType] = useState('COMMENT');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!qaEnabled && type !== 'COMMENT') setType('COMMENT');
  }, [qaEnabled, type]);

  if (!isAuthenticated) {
    return (
      <p className="qa-signin-hint">
        Please <Link to="/login">log in</Link> to ask a question or comment.
      </p>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError('');
    try {
      await onSubmit({
        body: trimmed,
        type: qaEnabled ? type : 'COMMENT',
      });
      setBody('');
      setType('COMMENT');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not submit. Please try again.');
    }
  }

  return (
    <form className="qa-composer" onSubmit={handleSubmit}>
      {qaEnabled && (
        <div className="qa-type-toggle" role="tablist" aria-label="Post type">
          <button
            type="button"
            role="tab"
            aria-selected={type === 'COMMENT'}
            className={`qa-type-button ${type === 'COMMENT' ? 'qa-type-button-active' : ''}`}
            onClick={() => setType('COMMENT')}
          >
            Comment
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === 'QUESTION'}
            className={`qa-type-button ${type === 'QUESTION' ? 'qa-type-button-active' : ''}`}
            onClick={() => setType('QUESTION')}
          >
            Question
          </button>
        </div>
      )}

      {replyTarget && (
        <div className="qa-reply-banner">
          <span>Replying to @{replyTarget.authorUsername}</span>
          <button type="button" className="qa-text-button" onClick={onCancelReply}>
            Cancel
          </button>
        </div>
      )}

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="qa-input"
        rows={4}
        placeholder={replyTarget ? 'Write your reply…' : 'Share your comment or ask a question…'}
        disabled={submitting}
      />
      {error && <p className="qa-inline-error">{error}</p>}
      <div className="qa-actions-row">
        <button className="btn btn-primary btn-sm" type="submit" disabled={submitting || !body.trim()}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}

function CommentNode({
  node,
  depth,
  currentUser,
  onReply,
  onDelete,
  onToggleVote,
  openMenuId,
  setOpenMenuId,
  isVotePending,
}) {
  const canDelete = currentUser && Number(currentUser.id) === Number(node.author);
  const menuOpen = openMenuId === node.id;
  const canReply = depth === 0 && !!currentUser;
  const votePending = isVotePending(node.id);

  return (
    <article className={`qa-comment ${depth > 0 ? 'qa-comment-reply' : ''}`}>
      <header className="qa-comment-header">
        <div className="qa-author-wrap">
          <strong>@{node.authorUsername}</strong>
          {node.type === 'QUESTION' && <span className="qa-question-pill">Question</span>}
        </div>
        <div className="qa-right-meta">
          <time className="qa-time">{formatDate(node.createdAt)}</time>
          {currentUser && (
            <div className="qa-menu-wrap">
              <button
                type="button"
                className="qa-icon-button"
                aria-label="Comment actions"
                onClick={() => setOpenMenuId(menuOpen ? null : node.id)}
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="qa-action-menu" role="menu">
                  {canReply && (
                    <button type="button" role="menuitem" onClick={() => onReply(node.id)}>
                      Reply
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" role="menuitem" className="qa-danger" onClick={() => onDelete(node.id)}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <p className="qa-body">{node.body}</p>
      <div className="qa-feedback-row">
        <button
          type="button"
          className={`qa-helpful-button ${node.hasVoted ? 'qa-helpful-button-active' : ''}`}
          onClick={() => onToggleVote(node.id)}
          disabled={votePending}
          aria-pressed={node.hasVoted}
        >
          {votePending ? 'Updating…' : node.hasVoted ? 'Helpful' : 'Mark Helpful'}
        </button>
        <p className="qa-helpful-count">Helpful: {node.helpfulCount}</p>
      </div>

      {node.replies.length > 0 && (
        <div className="qa-replies">
          {node.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              node={reply}
              depth={depth + 1}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
              onToggleVote={onToggleVote}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              isVotePending={isVotePending}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export default function RecipeCommentsSection({ recipeId, qaEnabled, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [votePendingIds, setVotePendingIds] = useState([]);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchCommentsForRecipe(recipeId)
      .then((data) => { if (!cancelled) setComments(data); })
      .catch(() => { if (!cancelled) setError('Could not load comments.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [recipeId]);

  const roots = useMemo(() => buildThreads(comments), [comments]);
  const replyTarget = replyTo ? comments.find((comment) => comment.id === replyTo) : null;

  async function handleSubmit({ body, type }) {
    setSubmitting(true);
    try {
      const created = await postComment(recipeId, {
        body,
        type,
        parentComment: replyTo,
      });
      setComments((prev) => [...prev, created]);
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    setDeleteError('');
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parentComment !== commentId));
      setOpenMenuId(null);
    } catch {
      setOpenMenuId(null);
      setDeleteError('Could not delete comment. Please try again.');
    }
  }

  async function handleToggleVote(commentId) {
    if (votePendingIds.includes(commentId)) return;
    const target = comments.find((comment) => comment.id === commentId);
    if (!target) return;
    const nextHasVoted = !target.hasVoted;
    const nextCount = Math.max(0, target.helpfulCount + (nextHasVoted ? 1 : -1));
    setVotePendingIds((prev) => [...prev, commentId]);
    setComments((prev) => prev.map((comment) => (
      comment.id === commentId ? { ...comment, hasVoted: nextHasVoted, helpfulCount: nextCount } : comment
    )));
    setOpenMenuId(null);
    try {
      await toggleCommentVote(commentId);
    } catch {
      setComments((prev) => prev.map((comment) => (
        comment.id === commentId
          ? { ...comment, hasVoted: target.hasVoted, helpfulCount: target.helpfulCount }
          : comment
      )));
    } finally {
      setVotePendingIds((prev) => prev.filter((id) => id !== commentId));
    }
  }

  return (
    <section className="qa-section" aria-label="Q&A section">
      <h2>Q&A and Comments</h2>
      {!qaEnabled && <p className="qa-disabled-note">Q&A is disabled by the author. You can still post comments.</p>}

      <Composer
        qaEnabled={qaEnabled}
        isAuthenticated={!!currentUser}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTo(null)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {loading && <p className="qa-status">Loading comments…</p>}
      {error && <p className="qa-status qa-error">{error}</p>}
      {deleteError && <p className="qa-status qa-error" role="alert">{deleteError}</p>}
      {!loading && !error && roots.length === 0 && <p className="qa-status">No comments yet.</p>}

      {!loading && !error && roots.length > 0 && (
        <div className="qa-thread-list">
          {roots.map((node) => (
            <CommentNode
              key={node.id}
              node={node}
              depth={0}
              currentUser={currentUser}
              onReply={(id) => {
                setReplyTo(id);
                setOpenMenuId(null);
              }}
              onDelete={handleDelete}
              onToggleVote={handleToggleVote}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              isVotePending={(id) => votePendingIds.includes(id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
