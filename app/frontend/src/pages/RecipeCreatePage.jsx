import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import IngredientRow from '../components/IngredientRow';
import StepsEditor from '../components/StepsEditor';
import Toast from '../components/Toast';
import DraftRestoreBanner from '../components/DraftRestoreBanner';
import CulturalStoryForm from '../components/CulturalStoryForm';
import { trimCulturalStoryForPayload } from '../components/culturalStoryFields';
import useDraftAutosave from '../hooks/useDraftAutosave';
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

const DRAFT_KEY = 'draft:recipe:new';
const MAX_DESC = 1000;

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

function StepHeader({ number, title, hint }) {
  return (
    <div className="step-header">
      <span className="step-number" aria-hidden="true">{number}</span>
      <div>
        <h2 className="step-title">{title}</h2>
        {hint && <p className="step-hint">{hint}</p>}
      </div>
    </div>
  );
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
  const [steps, setSteps] = useState([]);
  const [culturalStory, setCulturalStory] = useState({});

  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [regions, setRegions] = useState([]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const draftState = { title, description, region, qaEnabled, rows, steps };
  const { savedDraft, clearDraft } = useDraftAutosave(DRAFT_KEY, draftState, { enabled: true });

  const isDirty = useRef(false);
  const toastTimerRef = useRef(null);
  const navTimerRef = useRef(null);

  useEffect(() => {
    fetchIngredients().then(setIngredients).catch(() => {});
    fetchUnits().then(setUnits).catch(() => {});
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!isDirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  function markDirty() { isDirty.current = true; }

  function showToast(message, type) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }

  function handleRestore(draft) {
    if (draft.title !== undefined) setTitle(draft.title);
    if (draft.description !== undefined) setDescription(draft.description);
    if (draft.region !== undefined) setRegion(draft.region);
    if (draft.qaEnabled !== undefined) setQaEnabled(draft.qaEnabled);
    if (Array.isArray(draft.rows) && draft.rows.length > 0) setRows(draft.rows);
    if (Array.isArray(draft.steps)) setSteps(draft.steps);
    clearDraft();
  }

  const handleStepsChange = useCallback((next) => {
    markDirty();
    setSteps(next);
  }, []);

  const handleRowChange = useCallback((rowId, field, value) => {
    markDirty();
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

  function validate(publish) {
    const e = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (publish) {
      if (!description.trim() && !video) e.content = 'A description or video is required.';
      const filledRows = rows.filter((r) => r.ingredientId && r.amount && r.unitId);
      if (filledRows.length === 0) e.ingredients = 'Please add at least one ingredient with an amount.';
    }
    for (const row of rows) {
      if (row.amount !== '' && (isNaN(Number(row.amount)) || Number(row.amount) <= 0)) {
        e.amount = 'Amount must be a positive number.';
        break;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(publish) {
    if (submitting) return;
    if (!validate(publish)) {
      document.getElementById('error-summary')?.focus();
      return;
    }

    const validRows = rows.filter((r) => r.ingredientId && r.amount && r.unitId);
    const cleanedSteps = steps
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
    const culturalPayload = trimCulturalStoryForPayload(culturalStory);
    const payload = {
      title,
      description,
      region: region ? Number(region) : null,
      qa_enabled: qaEnabled,
      is_published: publish,
      steps: cleanedSteps,
      ingredients_write: validRows.map((r) => ({
        ingredient: r.ingredientId,
        amount: r.amount,
        unit: r.unitId,
      })),
      ...(Object.keys(culturalPayload).length > 0
        ? { cultural_context: culturalPayload }
        : {}),
    };

    setSubmitting(true);
    try {
      const created = await createRecipe(payload);
      if (video || thumbnail) {
        const mediaData = new FormData();
        if (video) mediaData.append('video', video);
        if (thumbnail) mediaData.append('image', thumbnail);
        try {
          await updateRecipe(created.id, mediaData);
        } catch {
          clearDraft();
          isDirty.current = false;
          showToast('Recipe published but media upload failed — open it to retry.', 'error');
          navTimerRef.current = setTimeout(() => navigate(`/recipes/${created.id}`), 1500);
          return;
        }
      }
      clearDraft();
      isDirty.current = false;
      showToast(publish ? 'Recipe published!' : 'Draft saved!', 'success');
      navTimerRef.current = setTimeout(() => navigate(`/recipes/${created.id}`), 1500);
    } catch {
      showToast(
        publish ? 'Failed to publish recipe. Please try again.' : 'Failed to save draft. Please try again.',
        'error'
      );
      setSubmitting(false);
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="page-card recipe-form">
      <h1 className="recipe-form-heading">Create a Recipe</h1>
      <p className="recipe-form-intro">
        Fill in the steps below. Fields marked <span aria-hidden="true">*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      <DraftRestoreBanner
        draft={savedDraft}
        onRestore={handleRestore}
        onDiscard={clearDraft}
      />

      {hasErrors && (
        <div
          id="error-summary"
          className="error-summary"
          role="alert"
          tabIndex={-1}
          aria-label="Form errors"
        >
          <strong>Please fix the following fields before publishing:</strong>
          <ul>
            {errors.title      && <li><a href="#title">Title</a></li>}
            {errors.content    && <li><a href="#description">Description or video</a></li>}
            {errors.amount     && <li><a href="#ingredients">Ingredient amount</a></li>}
            {errors.ingredients && <li><a href="#ingredients">Ingredients</a></li>}
          </ul>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); submit(true); }} noValidate>

        {/* ── Step 1: Basic info ── */}
        <section className="form-step">
          <StepHeader
            number="1"
            title="Basic Information"
            hint="Give your recipe a name and tell people what it is."
          />

          <div className="form-group">
            <label htmlFor="title">
              Recipe Title <span className="required-mark" aria-hidden="true">*</span>
            </label>
            <p id="title-hint" className="field-hint">
              Keep it short and descriptive, e.g. "Anatolian Lamb Stew"
            </p>
            <input
              id="title"
              aria-describedby="title-hint"
              aria-required="true"
              aria-invalid={!!errors.title}
              value={title}
              onChange={(e) => { markDirty(); setTitle(e.target.value); }}
              placeholder="e.g. Anatolian Lamb Stew"
            />
            {errors.title && <p className="field-error" role="alert">{errors.title}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description
              <span className="optional-mark"> (optional if uploading media)</span>
            </label>
            <p id="desc-hint" className="field-hint">
              Describe the dish, its history, or how to cook it. Up to {MAX_DESC} characters.
            </p>
            <textarea
              id="description"
              aria-describedby="desc-hint"
              rows={5}
              maxLength={MAX_DESC}
              value={description}
              onChange={(e) => { markDirty(); setDescription(e.target.value); }}
              placeholder="Tell the story of this recipe…"
            />
            <p className="char-count" aria-live="polite">
              {description.length} / {MAX_DESC}
            </p>
            {errors.content && <p className="field-error" role="alert">{errors.content}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="region">Region <span className="optional-mark">(optional)</span></label>
            <p id="region-hint" className="field-hint">Where does this recipe come from?</p>
            <select
              id="region"
              aria-describedby="region-hint"
              value={region}
              onChange={(e) => { markDirty(); setRegion(e.target.value); }}
            >
              <option value="">— Choose a region —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── Step 2: Ingredients ── */}
        <section className="form-step ingredients-section">
          <StepHeader
            number="2"
            title="Ingredients"
            hint="Add each ingredient with its amount and unit. You need at least one."
          />
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
          {errors.amount && <p className="field-error" role="alert">{errors.amount}</p>}
          {errors.ingredients && <p className="field-error" role="alert">{errors.ingredients}</p>}
          <button
            type="button"
            className="btn btn-outline add-ingredient-btn"
            onClick={() => { markDirty(); setRows((prev) => [...prev, makeRow()]); }}
            aria-label="Add another ingredient row"
          >
            + Add Ingredient
          </button>
        </section>

        {/* ── Step 3: Cooking steps ── */}
        <section className="form-step">
          <StepHeader
            number="3"
            title="Steps"
            hint="Walk readers through the recipe one step at a time. Order matters — use the arrows to reorder. Empty steps are skipped on save."
          />
          <StepsEditor value={steps} onChange={handleStepsChange} />

          <CulturalStoryForm
            values={culturalStory}
            onChange={(key, value) => {
              markDirty();
              setCulturalStory((prev) => ({ ...prev, [key]: value }));
            }}
          />
        </section>

        {/* ── Step 4: Media & options ── */}
        <section className="form-step">
          <StepHeader
            number="4"
            title="Media & Options"
            hint="Upload a photo or video, and choose your settings."
          />

          <div className="form-group">
            <label htmlFor="thumbnail">
              Thumbnail Photo <span className="optional-mark">(optional)</span>
            </label>
            <p id="thumb-hint" className="field-hint">JPG or PNG, up to 10 MB.</p>
            <input
              id="thumbnail"
              type="file"
              accept="image/*"
              aria-describedby="thumb-hint"
              onChange={(e) => { markDirty(); setThumbnail(e.target.files[0] || null); }}
            />
            {thumbnail && (
              <p className="file-chosen">Selected: {thumbnail.name}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="video">
              Video <span className="optional-mark">(optional)</span>
            </label>
            <p id="video-hint" className="field-hint">
              Upload a short cooking video. Required if you do not add a description.
            </p>
            <input
              id="video"
              type="file"
              accept="video/*"
              aria-describedby="video-hint"
              onChange={(e) => { markDirty(); setVideo(e.target.files[0] || null); }}
            />
            {video && (
              <p className="file-chosen">Selected: {video.name}</p>
            )}
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
        </section>

        <div className="recipe-form-actions">
          <div className="recipe-form-actions-buttons">
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
              className="btn btn-primary publish-btn"
              disabled={submitting}
              onClick={() => submit(true)}
            >
              {submitting ? 'Publishing…' : 'Publish Recipe'}
            </button>
          </div>
          <p className="publish-note">
            Drafts stay private to you. Published recipes are visible to everyone.
          </p>
        </div>
      </form>

      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
