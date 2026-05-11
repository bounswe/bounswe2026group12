import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchRegionStories } from '../services/culturalContentService';
import './FloatingCulturalPrompt.css';

const PROMPTS = [
  {
    question: 'Where are you from? 🏡',
    response: () => 'Let\'s take a little trip home',
  },
  {
    question: 'Where is your next destination? 🗺️',
    response: (name) => `Explore the cuisine of ${name}`,
  },
  {
    question: 'What would you like to taste this week? ✨',
    response: (name) => `Stories from ${name} are waiting for you`,
  },
];

export default function FloatingCulturalPrompt({ regions }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const modalCloseRef = useRef(null);
  const modalRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

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

  useEffect(() => {
    if (modalOpen && modalCloseRef.current) {
      modalCloseRef.current.focus();
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleTab(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [modalOpen, stories, storiesLoading]);

  function handleRegionSelect(region) {
    setSelectedRegion(region);
    setModalOpen(true);
    setStoriesLoading(true);
    setStoriesError(false);
    fetchRegionStories(region.id)
      .then((items) => {
        if (isMountedRef.current) {
          setStories(items);
        }
      })
      .catch(() => { if (isMountedRef.current) setStoriesError(true); })
      .finally(() => { if (isMountedRef.current) setStoriesLoading(false); });
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
            ref={modalRef}
            className="story-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="story-modal-header">
              <h2 id="story-modal-title">{selectedRegion?.name}</h2>
              <button ref={modalCloseRef} className="story-modal-close" onClick={closeModal} aria-label="Close">×</button>
            </div>
            {selectedRegion && (
              <p className="story-modal-subtitle">{prompt.response(selectedRegion.name)}</p>
            )}
            <div className="story-modal-body">
              {storiesLoading && <p className="story-modal-status">Loading…</p>}
              {!storiesLoading && storiesError && (
                <p className="story-modal-status">Failed to load stories. Please try again.</p>
              )}
              {!storiesLoading && !storiesError && stories.length === 0 && (
                <p className="story-modal-status">No stories for this region yet.</p>
              )}
              {!storiesLoading && !storiesError && stories.map((story) => (
                <Link
                  key={story.id}
                  to={`/stories/${story.id}`}
                  className="story-modal-card"
                  onClick={closeModal}
                >
                  <h3>{story.title}</h3>
                  <p className="story-modal-excerpt">{story.body}</p>
                  <span className="story-modal-author">@{story.author_username}</span>
                  <span className="story-modal-read-more">Read story →</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
