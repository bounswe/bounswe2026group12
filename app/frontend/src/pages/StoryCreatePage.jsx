import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStory } from '../services/storyService';
import { fetchRecipes } from '../services/recipeService';
import Toast from '../components/Toast';

export default function StoryCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState('en');
  const [linkedRecipe, setLinkedRecipe] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [allRecipes, setAllRecipes] = useState([]);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchRecipes().then(setAllRecipes).catch(() => {});
  }, []);

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

    const payload = {
      title,
      body,
      language,
      is_published: true,
      linked_recipe: linkedRecipe ? linkedRecipe.id : null,
    };

    try {
      const created = await createStory(payload);
      showToast('Story published!', 'success');
      navigate(`/stories/${created.id}`);
    } catch {
      showToast('Failed to publish story. Please try again.', 'error');
    }
  }

  const filteredRecipes = recipeSearch.trim()
    ? allRecipes.filter((r) =>
        r.title.toLowerCase().includes(recipeSearch.toLowerCase())
      )
    : allRecipes;

  return (
    <main>
      <h1>Create Story</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="story-title">Title</label>
          <input
            id="story-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="story-body">Body</label>
          <textarea
            id="story-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {errors.body && <p className="field-error">{errors.body}</p>}
        </div>

        <div>
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

        <section>
          <h2>Link a Recipe (optional)</h2>
          {linkedRecipe && (
            <p>Linked: {linkedRecipe.title}</p>
          )}
          <input
            type="text"
            placeholder="Search recipes…"
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
          />
          <ul>
            {filteredRecipes.map((r) => (
              <li key={r.id}>
                {r.title}
                <button
                  type="button"
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
        </section>

        <button type="submit">Publish</button>
      </form>

      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
