import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMapRegionContent } from '../services/mapService';
import './FloatingCulturalPrompt.css';

const PROMPTS = [
  {
    question: 'Nerelisin?',
    response: (name) => `Hadi ${name}'e ufak bir yolculuğa çıkalım 🏡`,
  },
  {
    question: 'Sıradaki seyahatin nereye?',
    response: (name) => `${name} mutfağını keşfedelim 🗺️`,
  },
  {
    question: 'Bu hafta neyi tatmak isterdin?',
    response: (name) => `${name}'den hikayeler seni bekliyor ✨`,
  },
];

export default function FloatingCulturalPrompt({ regions }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('cultural_prompt_shown')) return;

    function handleScroll() {
      if (window.scrollY > 300) {
        setVisible(true);
        window.removeEventListener('scroll', handleScroll);
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleRegionSelect(region) {
    setSelectedRegion(region);
    setModalOpen(true);
    setStoriesLoading(true);
    fetchMapRegionContent(region.id)
      .then((items) => setStories(items.filter((i) => i.content_type === 'story')))
      .finally(() => setStoriesLoading(false));
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem('cultural_prompt_shown', '1');
  }

  function closeModal() {
    setModalOpen(false);
  }

  if (!visible || dismissed || regions.length === 0) return null;

  return (
    <>
      <div className="floating-prompt" role="complementary" aria-label="Cultural discovery prompt">
        <button className="floating-prompt-close" onClick={handleDismiss} aria-label="Dismiss">×</button>
        <p className="floating-prompt-question">{prompt.question}</p>
        <div className="floating-prompt-chips">
          {regions.map((r) => (
            <button
              key={r.id}
              className="floating-prompt-chip"
              onClick={() => handleRegionSelect(r)}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="story-modal-backdrop" onClick={closeModal}>
          <div
            className="story-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="story-modal-header">
              <h2>{selectedRegion && prompt.response(selectedRegion.name)}</h2>
              <button className="story-modal-close" onClick={closeModal} aria-label="Close">×</button>
            </div>
            <div className="story-modal-body">
              {storiesLoading && <p className="story-modal-status">Loading…</p>}
              {!storiesLoading && stories.length === 0 && (
                <p className="story-modal-status">No stories for this region yet.</p>
              )}
              {!storiesLoading && stories.map((story) => (
                <Link
                  key={story.id}
                  to={`/stories/${story.id}`}
                  className="story-modal-card"
                  onClick={closeModal}
                >
                  <h3>{story.title}</h3>
                  <p className="story-modal-excerpt">{story.body?.slice(0, 120)}…</p>
                  <span className="story-modal-author">@{story.author_username}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
