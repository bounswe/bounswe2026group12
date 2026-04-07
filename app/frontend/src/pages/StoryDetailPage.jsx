import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchStory } from '../services/storyService';
import './StoryDetailPage.css';

export default function StoryDetailPage() {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStory(id)
      .then((data) => { if (!cancelled) setStory(data); })
      .catch(() => { if (!cancelled) setError('Could not load story.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!story) return null;

  return (
    <main className="page-card story-detail">
      <h1 className="story-title">{story.title}</h1>
      {story.author_username && (
        <p className="story-author">By {story.author_username}</p>
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
