import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchRecipe, deleteRecipe } from '../services/recipeService';
import { fetchRegions } from '../services/searchService';
import { fetchSubstitutes } from '../services/ingredientService';
import { fetchCheckedIngredients, toggleCheckedIngredient } from '../services/checkOffService';
import RecipeCommentsSection from '../components/RecipeCommentsSection';
import HeritageBadge from '../components/HeritageBadge';
import CulturalFactCard from '../components/CulturalFactCard';
import { fetchCulturalFacts } from '../services/culturalFactService';
import './RecipeDetailPage.css';

const MATCH_TYPE_LABELS = {
  ingredient: { label: 'Similar', cls: 'chip-ingredient' },
  flavor: { label: 'Flavor', cls: 'chip-flavor' },
  texture: { label: 'Texture', cls: 'chip-texture' },
  chemical: { label: 'Chemical', cls: 'chip-chemical' },
};

function MatchChip({ type }) {
  const info = MATCH_TYPE_LABELS[type] ?? { label: type, cls: 'chip-default' };
  return <span className={`sub-match-chip ${info.cls}`}>{info.label}</span>;
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState(null);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useConverted, setUseConverted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // #372 — ingredient check-off
  const [checked, setChecked] = useState(new Set());

  // #370 — substitution UI
  const [openSubPanel, setOpenSubPanel] = useState(null); // ingredientId
  const [substitutes, setSubstitutes] = useState({});     // ingredientId → options[]
  const [appliedSubs, setAppliedSubs] = useState({});     // ingredientId → substitute obj

  // #373 — shopping list
  const [showShoppingList, setShowShoppingList] = useState(false);

  const [recipeFacts, setRecipeFacts] = useState([]);

  useEffect(() => {
    setChecked(new Set());
    setShowShoppingList(false);
    setOpenSubPanel(null);
    setSubstitutes({});
    setAppliedSubs({});
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetchRegions().then((r) => { if (!cancelled) setRegions(r); }).catch(() => {});
    fetchRecipe(id)
      .then((data) => { if (!cancelled) setRecipe(data); })
      .catch(() => { if (!cancelled) setError('Could not load recipe.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchCheckedIngredients(id)
      .then((ids) => { if (!cancelled) setChecked(new Set(ids)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, id]);

  useEffect(() => {
    const groupId = recipe?.heritage_group?.id;
    if (!groupId) {
      setRecipeFacts([]);
      return;
    }
    let cancelled = false;
    fetchCulturalFacts({ heritageGroup: groupId })
      .then((data) => { if (!cancelled) setRecipeFacts(data); })
      .catch(() => { if (!cancelled) setRecipeFacts([]); });
    return () => { cancelled = true; };
  }, [recipe?.heritage_group?.id]);

  const toggleCheck = useCallback(async (ingredientId) => {
    if (!user) return;
    const wasChecked = checked.has(ingredientId);
    setChecked((prev) => {
      const next = new Set(prev);
      if (wasChecked) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
    if (!wasChecked && openSubPanel === ingredientId) setOpenSubPanel(null);
    try {
      const canonical = await toggleCheckedIngredient(id, ingredientId, !wasChecked);
      setChecked(new Set(canonical));
    } catch {
      setChecked((prev) => {
        const next = new Set(prev);
        if (wasChecked) next.add(ingredientId);
        else next.delete(ingredientId);
        return next;
      });
    }
  }, [checked, id, openSubPanel, user]);

  const openSub = useCallback(async (ingredientId, ingredientName) => {
    if (openSubPanel === ingredientId) {
      setOpenSubPanel(null);
      return;
    }
    setOpenSubPanel(ingredientId);
    if (!substitutes[ingredientId]) {
      const subs = await fetchSubstitutes(ingredientId, ingredientName).catch(() => []);
      setSubstitutes((prev) => ({ ...prev, [ingredientId]: subs }));
    }
  }, [openSubPanel, substitutes]);

  const applySub = useCallback((ingredientId, sub) => {
    setAppliedSubs((prev) => ({ ...prev, [ingredientId]: sub }));
    setOpenSubPanel(null);
  }, []);

  const clearSub = useCallback((ingredientId) => {
    setAppliedSubs((prev) => { const n = { ...prev }; delete n[ingredientId]; return n; });
  }, []);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteRecipe(recipe.id);
      navigate('/recipes');
    } catch {
      setDeleteError('Could not delete recipe.');
      setDeleting(false);
    }
  }, [deleting, navigate, recipe]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!recipe) return null;

  const isAuthor = user && user.id === recipe.author;
  const regionName = regions.find((r) => r.id === recipe.region)?.name;

  const hasConverted = (recipe.ingredients ?? []).some((ri) => ri.converted_amount);

  // Shopping list: unchecked ingredients with substitutions applied
  const shoppingItems = (recipe.ingredients ?? [])
    .filter((ri) => !checked.has(ri.ingredient))
    .map((ri) => {
      const sub = appliedSubs[ri.ingredient];
      const amount = useConverted && ri.converted_amount ? ri.converted_amount : ri.amount;
      const unit = useConverted && ri.converted_unit_name ? ri.converted_unit_name : ri.unit_name;
      return {
        key: ri.ingredient,
        name: sub ? sub.name : ri.ingredient_name,
        amount,
        unit,
        isSub: Boolean(sub),
      };
    });

  return (
    <main className="page-card recipe-detail">
      <div className="recipe-detail-header">
        <div>
          {regionName && <span className="recipe-region-tag">{regionName}</span>}
          <h1 className="recipe-title">{recipe.title}</h1>
          {recipe.author_username && (
            <p className="recipe-author"><Link to={`/users/${recipe.author_username}`} className="recipe-author-link">By {recipe.author_username}</Link></p>
          )}
        </div>
        <div className="recipe-detail-actions">
          {isAuthor && (
            <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-outline btn-sm">
              Edit
            </Link>
          )}
          {isAuthor && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          {isAuthor && deleteError && (
            <p className="recipe-detail-error" role="alert">{deleteError}</p>
          )}
          {user && !isAuthor && recipe.author_username && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() =>
                navigate(
                  `/inbox?compose=true&to=${recipe.author}&toUsername=${encodeURIComponent(recipe.author_username)}` +
                  `&recipeId=${recipe.id}&recipeTitle=${encodeURIComponent(recipe.title)}`
                )
              }
            >
              Message @{recipe.author_username}
            </button>
          )}
        </div>
      </div>

      {recipe.image && (
        <img src={recipe.image} alt={recipe.title} className="recipe-detail-image" />
      )}

      {recipe.video && (
        <video data-testid="recipe-video" controls src={recipe.video} className="recipe-video" />
      )}

      {recipe.description && (
        <p className="recipe-description">{recipe.description}</p>
      )}

      {/* ── Ingredients (#372 check-off, #370 substitution, #377 unit toggle) ── */}
      <section className="recipe-ingredients">
        <div className="ingredients-header">
          <h2>Ingredients</h2>
          <div className="ingredients-header-controls">
            {hasConverted && (
              <div className="unit-toggle" role="group" aria-label="Unit system">
                <button
                  className={`unit-toggle-btn${!useConverted ? ' active' : ''}`}
                  onClick={() => setUseConverted(false)}
                >
                  Original
                </button>
                <button
                  className={`unit-toggle-btn${useConverted ? ' active' : ''}`}
                  onClick={() => setUseConverted(true)}
                >
                  Converted
                </button>
              </div>
            )}
            {user && shoppingItems.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowShoppingList((v) => !v)}
              >
                {showShoppingList ? 'Hide list' : `Shopping list (${shoppingItems.length})`}
              </button>
            )}
          </div>
        </div>

        <ul className="ingredients-list">
          {(recipe.ingredients ?? []).map((ri, index) => {
            const isChecked = checked.has(ri.ingredient);
            const sub = appliedSubs[ri.ingredient];
            const amount = useConverted && ri.converted_amount ? ri.converted_amount : ri.amount;
            const unit = useConverted && ri.converted_unit_name ? ri.converted_unit_name : ri.unit_name;
            const isSubOpen = openSubPanel === ri.ingredient;

            return (
              <li key={`${ri.ingredient}-${index}`} className={`ingredient-item${isChecked ? ' checked' : ''}`}>
                <div className="ingredient-row">
                  {user && (
                    <input
                      type="checkbox"
                      className="ingredient-checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(ri.ingredient)}
                      aria-label={`Mark ${ri.ingredient_name} as available`}
                    />
                  )}
                  <span className="ingredient-name">
                    {sub ? (
                      <>
                        <span className="ingredient-name-subbed">{ri.ingredient_name}</span>
                        <span className="ingredient-sub-arrow">→</span>
                        <span className="ingredient-sub-name">{sub.name}</span>
                        <button
                          className="ingredient-clear-sub"
                          onClick={() => clearSub(ri.ingredient)}
                          aria-label="Remove substitution"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      ri.ingredient_name
                    )}
                  </span>
                  <span className="ingredient-amount">{amount} {unit}</span>
                  {user && !isChecked && (
                    <button
                      className={`ingredient-sub-btn${isSubOpen ? ' active' : ''}`}
                      onClick={() => openSub(ri.ingredient, ri.ingredient_name)}
                      aria-expanded={isSubOpen}
                      aria-label={`Find substitutes for ${ri.ingredient_name}`}
                    >
                      Sub
                    </button>
                  )}
                </div>

                {isSubOpen && (
                  <div className="sub-panel" role="listbox" aria-label="Substitution options">
                    {substitutes[ri.ingredient] ? (
                      substitutes[ri.ingredient].map((s) => (
                        <button
                          key={s.id}
                          className="sub-option"
                          role="option"
                          aria-selected={false}
                          onClick={() => applySub(ri.ingredient, s)}
                        >
                          <span className="sub-option-name">{s.name}</span>
                          <MatchChip type={s.match_type} />
                        </button>
                      ))
                    ) : (
                      <p className="sub-loading">Loading…</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* ── Shopping list (#373) ── */}
        {user && showShoppingList && (
          <div className="shopping-list">
            <div className="shopping-list-header">
              <h3>Shopping List</h3>
              <button
                className="shopping-list-copy"
                onClick={() => {
                  const text = shoppingItems
                    .map((i) => `${i.name} — ${i.amount} ${i.unit}`)
                    .join('\n');
                  navigator.clipboard.writeText(text).catch(() => {});
                }}
              >
                Copy
              </button>
            </div>
            {shoppingItems.length === 0 ? (
              <p className="shopping-list-empty">All ingredients are checked off!</p>
            ) : (
              <ul className="shopping-list-items">
                {shoppingItems.map((item) => (
                  <li key={item.key} className={`shopping-list-item${item.isSub ? ' is-sub' : ''}`}>
                    <span className="shopping-item-name">
                      {item.name}
                      {item.isSub && <span className="shopping-sub-badge">sub</span>}
                    </span>
                    <span className="shopping-item-qty">{item.amount} {item.unit}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {recipe.heritage_group && (
        <section className="recipe-heritage">
          <HeritageBadge group={recipe.heritage_group} />
        </section>
      )}

      {recipeFacts.length > 0 && (
        <section className="recipe-cultural-facts">
          <h2 className="recipe-cultural-facts-heading">Did You Know?</h2>
          <div className="recipe-cultural-facts-list">
            {recipeFacts.map((fact) => (
              <CulturalFactCard key={fact.id} fact={fact} />
            ))}
          </div>
        </section>
      )}

      <RecipeCommentsSection
        recipeId={recipe.id}
        qaEnabled={Boolean(recipe.qa_enabled)}
        currentUser={user}
      />
    </main>
  );
}
