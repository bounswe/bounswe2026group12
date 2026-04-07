import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchStory } from '../services/storyService';
import './StoryDetailPage.css';

export default function StoryDetailPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ownershipError, setOwnershipError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStory(id)
      .then((data) => { if (!cancelled) setStory(data); })
      .catch(() => { if (!cancelled) setError('Could not load story.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    setOwnershipError('');
  }, [story?.id]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!story) return null;

  const storyAuthorId = story.author && typeof story.author === 'object' ? story.author.id : story.author;
  const isAuthor = user && storyAuthorId != null && user.id === storyAuthorId;

  function handleEditClick() {
    setOwnershipError('You can only edit your own stories.');
  }

  return (
    <main className="page-card story-detail">
      <div className="story-detail-header">
        <h1 className="story-title">{story.title}</h1>
        {user && (
          isAuthor
            ? (
              <Link
                to={`/stories/${story.id}/edit`}
                className="btn btn-outline btn-sm"
                aria-label="Edit Story"
              >
                Edit Story
              </Link>
            )
            : (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleEditClick}
                aria-label="Edit Story"
              >
                Edit Story
              </button>
            )
        )}
      </div>

      {ownershipError && (
        <p className="story-ownership-error">{ownershipError}</p>
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
          <Link to={`/recipes/${story.linked_recipe.id}`} className="linked-recipe-card">
            <span className="linked-recipe-title">{story.linked_recipe.title}</span>
            {story.linked_recipe.region && (
              <span className="linked-recipe-region">{story.linked_recipe.region}</span>
            )}
          </Link>
        </section>
      )}
    </main>
  );
}
