import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchStories } from '../services/storyService';
import './StoryListPage.css';

export default function StoryListPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStories()
      .then((data) => { if (!cancelled) setStories(data); })
      .catch(() => { if (!cancelled) setError('Could not load stories.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;

  return (
    <main className="page-card story-list">
      <h1 className="story-list-heading">Stories</h1>
      {stories.length === 0 && (
        <p className="story-list-empty">No stories yet. Be the first to share one!</p>
      )}
      <div className="story-list-grid">
        {stories.map((story) => (
          <article key={story.id} className="story-card">
            <div className="story-card-img-wrap">
              {story.image
                ? <img src={story.image} alt={story.title} className="story-card-img" />
                : <div className="story-card-placeholder" />
              }
            </div>
            <div className="story-card-body">
              <h2 className="story-card-title">
                <Link to={`/stories/${story.id}`} className="story-card-link">{story.title}</Link>
              </h2>
              {story.region_name && <span className="story-card-region">{story.region_name}</span>}
              {story.author_username && (
                <p className="story-card-author">By {story.author_username}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
