import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchStory, deleteStory, publishStory, unpublishStory } from '../services/storyService';
import './StoryDetailPage.css';

export default function StoryDetailPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [publishError, setPublishError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStory(id)
      .then((data) => { if (!cancelled) setStory(data); })
      .catch(() => { if (!cancelled) setError('Could not load story.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const storyAuthorId = story && (story.author && typeof story.author === 'object' ? story.author.id : story.author);
  const isAuthor = user && storyAuthorId != null && user.id === storyAuthorId;

  const handleDelete = useCallback(async () => {
    if (deleting || !story) return;
    if (!window.confirm('Delete this story? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteStory(story.id);
      navigate('/stories');
    } catch {
      setDeleteError('Could not delete story.');
      setDeleting(false);
    }
  }, [deleting, navigate, story]);

  const handleTogglePublish = useCallback(async () => {
    if (togglingPublish || !story) return;
    setTogglingPublish(true);
    setPublishError('');
    try {
      const updated = story.is_published
        ? await unpublishStory(story.id)
        : await publishStory(story.id);
      setStory((prev) => ({ ...prev, ...updated }));
    } catch {
      setPublishError(
        story.is_published ? 'Could not unpublish story.' : 'Could not publish story.'
      );
    } finally {
      setTogglingPublish(false);
    }
  }, [togglingPublish, story]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!story) return null;

  return (
    <main className="page-card story-detail">
      <div className="story-detail-header">
        <h1 className="story-title">{story.title}</h1>
        {isAuthor && (
          <div className="story-detail-actions">
            <Link
              to={`/stories/${story.id}/edit`}
              className="btn btn-outline btn-sm"
              aria-label="Edit Story"
            >
              Edit Story
            </Link>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleTogglePublish}
              disabled={togglingPublish}
            >
              {togglingPublish ? '…' : story.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {isAuthor && deleteError && (
        <p className="story-detail-error" role="alert">{deleteError}</p>
      )}

      {isAuthor && publishError && (
        <p className="story-detail-error" role="alert">{publishError}</p>
      )}

      {(story.author?.username || story.author_username) && (
        <p className="story-author">By {story.author?.username || story.author_username}</p>
      )}

      {story.image && (
        <img
          src={story.image}
          alt={story.title}
          className="story-detail-image"
        />
      )}

      <p className="story-body">{story.body}</p>

      {story.linked_recipe && (
        <section className="story-linked-recipe">
          <h2>Linked Recipe</h2>
          <Link to={`/recipes/${story.linked_recipe}`} className="linked-recipe-card">
            <span className="linked-recipe-title">{story.recipe_title}</span>
          </Link>
        </section>
      )}
    </main>
  );
}
