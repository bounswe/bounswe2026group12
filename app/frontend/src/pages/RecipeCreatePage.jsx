import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import IngredientRow from '../components/IngredientRow';
import Toast from '../components/Toast';
import {
  createRecipe,
  updateRecipe,
  fetchIngredients,
  fetchUnits,
  submitIngredient,
  submitUnit,
} from '../services/recipeService';
import { fetchRegions } from '../services/searchService';
import './RecipeCreatePage.css';

function makeRow() {
  return {
    id: `row-${Math.random().toString(36).slice(2)}`,
    ingredientId: null,
    ingredientName: '',
    amount: '',
    unitId: null,
    unitName: '',
  };
}

export default function RecipeCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [qaEnabled, setQaEnabled] = useState(true);
  const [rows, setRows] = useState([makeRow()]);

  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [regions, setRegions] = useState([]);

  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchIngredients().then(setIngredients).catch(() => {});
    fetchUnits().then(setUnits).catch(() => {});
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }

  const handleRowChange = useCallback((rowId, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  }, []);

  const handleRowRemove = useCallback((rowId) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }, []);

  const handleNewIngredient = useCallback(async (name) => {
    const newIngredient = await submitIngredient(name);
    setIngredients((prev) => [...prev, newIngredient]);
    return newIngredient;
  }, []);

  const handleNewUnit = useCallback(async (name) => {
    const newUnit = await submitUnit(name);
    setUnits((prev) => [...prev, newUnit]);
    return newUnit;
  }, []);

  function validate() {
    const e = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!description.trim() && !video) e.content = 'A description or video is required.';
    for (const row of rows) {
      if (row.amount !== '' && (isNaN(Number(row.amount)) || Number(row.amount) <= 0)) {
        e.amount = 'Amount must be a positive number.';
        break;
      }
    }
    const filledRows = rows.filter((r) => r.ingredientId && r.amount && r.unitId);
    if (filledRows.length === 0) e.ingredients = 'At least one ingredient with amount is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const validRows = rows.filter((r) => r.ingredientId && r.amount && r.unitId);
    const payload = {
      title,
      description,
      region: region ? Number(region) : null,
      qa_enabled: qaEnabled,
      is_published: true,
      ingredients_write: validRows.map((r) => ({
        ingredient: r.ingredientId,
        amount: r.amount,
        unit: r.unitId,
      })),
    };

    try {
      const created = await createRecipe(payload);

      if (video || thumbnail) {
        const mediaData = new FormData();
        if (video) mediaData.append('video', video);
        if (thumbnail) mediaData.append('image', thumbnail);
        await updateRecipe(created.id, mediaData);
      }

      showToast('Recipe published!', 'success');
      setTimeout(() => navigate(`/recipes/${created.id}`), 1500);
    } catch {
      showToast('Failed to publish recipe. Please try again.', 'error');
    }
  }

  return (
    <main className="page-card recipe-form">
      <h1 className="recipe-form-heading">Create Recipe</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {errors.content && <p className="field-error">{errors.content}</p>}

        <div className="form-group">
          <label htmlFor="region">Region</label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Select a region</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="video">Video</label>
          <input
            id="video"
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0] || null)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="thumbnail">Thumbnail Image (optional)</label>
          <input
            id="thumbnail"
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnail(e.target.files[0] || null)}
          />
        </div>

        <div className="form-group form-group-checkbox">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={qaEnabled}
              onChange={(e) => setQaEnabled(e.target.checked)}
            />
            Enable Q&amp;A on this recipe
          </label>
        </div>

        <section className="ingredients-section">
          <h2>Ingredients</h2>
          {rows.map((row) => (
            <IngredientRow
              key={row.id}
              row={row}
              ingredients={ingredients}
              units={units}
              onChange={handleRowChange}
              onRemove={handleRowRemove}
              onNewIngredient={handleNewIngredient}
              onNewUnit={handleNewUnit}
            />
          ))}
          {errors.amount && <p className="field-error">{errors.amount}</p>}
          {errors.ingredients && <p className="field-error">{errors.ingredients}</p>}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setRows((prev) => [...prev, makeRow()])}
          >
            + Add Ingredient
          </button>
        </section>

        <div className="recipe-form-actions">
          <button type="submit" className="btn btn-primary">Publish Recipe</button>
        </div>
      </form>

      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
