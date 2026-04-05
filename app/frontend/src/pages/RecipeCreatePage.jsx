import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import IngredientRow from '../components/IngredientRow';
import Toast from '../components/Toast';
import {
  createRecipe,
  fetchIngredients,
  fetchUnits,
  submitIngredient,
  submitUnit,
} from '../services/recipeService';

let _rowCounter = 0;
function makeRow() {
  _rowCounter += 1;
  return {
    id: `row-${_rowCounter}`,
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
  const [qaEnabled, setQaEnabled] = useState(true);
  const [rows, setRows] = useState([makeRow()]);

  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);

  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchIngredients().then(setIngredients).catch(() => {});
    fetchUnits().then(setUnits).catch(() => {});
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
      const created = await createRecipe(formData);
      showToast('Recipe published!', 'success');
      setTimeout(() => navigate(`/recipes/${created.id}`), 1500);
    } catch {
      showToast('Failed to publish recipe. Please try again.', 'error');
    }
  }

  return (
    <main>
      <h1>Create Recipe</h1>
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
          <button type="button" onClick={() => setRows((prev) => [...prev, makeRow()])}>
            Add Ingredient
          </button>
        </section>

        <button type="submit">Publish</button>
      </form>

      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
