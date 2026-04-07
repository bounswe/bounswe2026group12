import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchStory, updateStory } from '../services/storyService';
import { fetchRecipes } from '../services/recipeService';
import Toast from '../components/Toast';
import './StoryEditPage.css';

export default function StoryEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [story, setStory] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState('en');
  const [image, setImage] = useState(null);
  const [linkedRecipe, setLinkedRecipe] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStory(id), fetchRecipes()])
      .then(([storyData, recipes]) => {
        if (cancelled) return;
        setStory(storyData);
        setTitle(storyData.title);
        setBody(storyData.body || '');
        setLanguage(storyData.language || 'en');
        setLinkedRecipe(storyData.linked_recipe || null);
        setAllRecipes(recipes);
      })
      .catch(() => { if (!cancelled) setLoadError('Could not load story.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }

  function validate() {
    const e = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!body.trim()) e.body = 'Body is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);
    formData.append('language', language);
    if (linkedRecipe) formData.append('linked_recipe', linkedRecipe.id);
    if (image) formData.append('image', image);

    try {
      await updateStory(id, formData);
      showToast('Story updated!', 'success');
      setTimeout(() => navigate(`/stories/${id}`), 1500);
    } catch {
      showToast('Failed to save changes. Please try again.', 'error');
    }
  }

  if (loading) return <p className="page-status">Loading…</p>;
  if (loadError) return <p className="page-status page-error">{loadError}</p>;
  if (story && user && story.author && user.id !== story.author.id) {
    return <p className="page-status page-error">You are not authorized to edit this story.</p>;
  }

  const filteredRecipes = recipeSearch.trim()
    ? allRecipes.filter((r) =>
        r.title.toLowerCase().includes(recipeSearch.toLowerCase())
      )
    : allRecipes;

  return (
    <main className="page-card story-form">
      <h1 className="story-form-heading">Edit Story</h1>
      <form onSubmit={handleSubmit}>
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
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </div>
      </form>
      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
