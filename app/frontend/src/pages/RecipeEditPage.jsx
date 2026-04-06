import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IngredientRow from '../components/IngredientRow';
import Toast from '../components/Toast';
import {
  fetchRecipe,
  updateRecipe,
  fetchIngredients,
  fetchUnits,
  submitIngredient,
  submitUnit,
} from '../services/recipeService';

let _rowCounter = 0;

function makeRowFromIngredient(ri) {
  return {
    id: `row-${++_rowCounter}`,
    ingredientId: ri.ingredient.id,
    ingredientName: ri.ingredient.name,
    amount: ri.amount,
    unitId: ri.unit.id,
    unitName: ri.unit.name,
  };
}

function makeEmptyRow() {
  return {
    id: `row-${++_rowCounter}`,
    ingredientId: null,
    ingredientName: '',
    amount: '',
    unitId: null,
    unitName: '',
  };
}

export default function RecipeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [video, setVideo] = useState(null);
  const [qaEnabled, setQaEnabled] = useState(false);
  const [rows, setRows] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRecipe(id), fetchIngredients(), fetchUnits()])
      .then(([recipe, ings, uns]) => {
        if (cancelled) return;
        setTitle(recipe.title);
        setDescription(recipe.description || '');
        setRegion(recipe.region || '');
        setQaEnabled(recipe.qa_enabled ?? true);
        setRows(
          recipe.ingredients && recipe.ingredients.length > 0
            ? recipe.ingredients.map(makeRowFromIngredient)
            : [makeEmptyRow()]
        );
        setIngredients(ings);
        setUnits(uns);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load recipe.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

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
    for (const row of rows) {
      if (row.amount !== '' && (isNaN(Number(row.amount)) || Number(row.amount) <= 0)) {
        e.amount = 'Amount must be a positive number.';
        break;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('region', region);
    formData.append('qa_enabled', qaEnabled);
    formData.append('is_published', 'true');
    if (video) formData.append('video', video);

    const validRows = rows.filter((r) => r.ingredientId && r.amount && r.unitId);
    validRows.forEach((r, i) => {
      formData.append(`ingredients[${i}][ingredient]`, r.ingredientId);
      formData.append(`ingredients[${i}][amount]`, r.amount);
      formData.append(`ingredients[${i}][unit]`, r.unitId);
    });

    try {
      await updateRecipe(id, formData);
      showToast('Recipe updated!', 'success');
      setTimeout(() => navigate(`/recipes/${id}`), 1500);
    } catch {
      showToast('Failed to save changes. Please try again.', 'error');
    }
  }

  if (loading) return <p>Loading...</p>;

  if (loadError) return <p>{loadError}</p>;

  return (
    <main>
      <h1>Edit Recipe</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="region">Region</label>
          <input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="video">Video</label>
          <input
            id="video"
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0] || null)}
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={qaEnabled}
              onChange={(e) => setQaEnabled(e.target.checked)}
            />
            {' '}Enable Q&amp;A on this recipe
          </label>
        </div>

        <section>
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
          <button type="button" onClick={() => setRows((prev) => [...prev, makeEmptyRow()])}>
            Add Ingredient
          </button>
        </section>

        <button type="submit">Save Changes</button>
      </form>

      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
