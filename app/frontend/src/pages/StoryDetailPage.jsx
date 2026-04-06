import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchStory } from '../services/storyService';

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

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!story) return null;

  return (
    <main>
      <h1>{story.title}</h1>
      {story.author && <p>By {story.author.username}</p>}
      <p>{story.body}</p>

      {story.linked_recipe && (
        <section>
          <h2>Linked Recipe</h2>
          <Link to={`/recipes/${story.linked_recipe.id}`}>
            {story.linked_recipe.title}
          </Link>
          {story.linked_recipe.region && (
            <span> — {story.linked_recipe.region}</span>
          )}
        </section>
      )}
    </main>
  );
}
