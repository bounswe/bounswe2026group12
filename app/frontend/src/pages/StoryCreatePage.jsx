import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStory } from '../services/storyService';
import { fetchRecipes } from '../services/recipeService';
import Toast from '../components/Toast';
import DraftRestoreBanner from '../components/DraftRestoreBanner';
import useDraftAutosave from '../hooks/useDraftAutosave';
import './StoryCreatePage.css';

const DRAFT_KEY = 'draft:story:new';

export default function StoryCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState('en');
  const [image, setImage] = useState(null);
  const [linkedRecipe, setLinkedRecipe] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [allRecipes, setAllRecipes] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const draftState = { title, body, language, linkedRecipe };
  const { savedDraft, clearDraft } = useDraftAutosave(DRAFT_KEY, draftState, { enabled: true });

  useEffect(() => {
    fetchRecipes().then(setAllRecipes).catch(() => {});
  }, []);

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }

  function handleRestore(draft) {
    if (draft.title !== undefined) setTitle(draft.title);
    if (draft.body !== undefined) setBody(draft.body);
    if (draft.language !== undefined) setLanguage(draft.language);
    if (draft.linkedRecipe !== undefined) setLinkedRecipe(draft.linkedRecipe);
    clearDraft();
  }

  function validate() {
    const e = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!body.trim()) e.body = 'Body is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(publish) {
    if (submitting || !validate()) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);
    formData.append('language', language);
    formData.append('is_published', publish ? 'true' : 'false');
    if (linkedRecipe) formData.append('linked_recipe', linkedRecipe.id);
    if (image) formData.append('image', image);

    setSubmitting(true);
    try {
      const created = await createStory(formData);
      clearDraft();
      showToast(publish ? 'Story published!' : 'Draft saved!', 'success');
      navigate(`/stories/${created.id}`);
    } catch {
      showToast(
        publish ? 'Failed to publish story. Please try again.' : 'Failed to save draft. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRecipes = recipeSearch.trim()
    ? allRecipes.filter((r) =>
        r.title.toLowerCase().includes(recipeSearch.toLowerCase())
      )
    : allRecipes;

  return (
    <main className="page-card story-form">
      <h1 className="story-form-heading">Create Story</h1>
      <DraftRestoreBanner
        draft={savedDraft}
        onRestore={handleRestore}
        onDiscard={clearDraft}
      />
      <form onSubmit={(e) => { e.preventDefault(); submit(true); }}>
        <div className="form-group">
          <label htmlFor="story-title">Title</label>
          <input
            id="story-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="story-body">Body</label>
          <textarea
            id="story-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {errors.body && <p className="field-error">{errors.body}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="story-language">Language</label>
          <select
            id="story-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="tr">Turkish</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="story-photo">Photo (optional)</label>
          <input
            id="story-photo"
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0] || null)}
          />
        </div>

        <section className="recipe-link-section">
          <h2>Link a Recipe <span className="optional-tag">(optional)</span></h2>
          {linkedRecipe && (
            <div className="linked-badge">
              <span>Linked: {linkedRecipe.title}</span>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => setLinkedRecipe(null)}
              >
                Remove
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Search recipes…"
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
            className="recipe-search-input"
          />
          {filteredRecipes.length > 0 && (
            <ul className="recipe-link-list">
              {filteredRecipes.map((r) => (
                <li key={r.id} className="recipe-link-item">
                  <span>{r.title}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      setLinkedRecipe(r);
                      setRecipeSearch('');
                    }}
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="story-form-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={submitting}
            onClick={() => submit(false)}
          >
            Save as draft
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting}
            onClick={() => submit(true)}
          >
            {submitting ? 'Publishing…' : 'Publish Story'}
          </button>
        </div>
      </form>

      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
