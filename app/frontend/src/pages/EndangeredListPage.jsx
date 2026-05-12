import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecipesByHeritageStatus } from '../services/recipeService';
import HeritageStatusBadge from '../components/HeritageStatusBadge';
import './EndangeredListPage.css';

const STATUS_FILTERS = [
  { key: 'endangered', label: 'Endangered' },
  { key: 'revived',    label: 'Revived' },
  { key: 'preserved',  label: 'Preserved' },
];

function RecipeRow({ recipe }) {
  return (
    <li className="endangered-list-row">
      <Link to={`/recipes/${recipe.id}`} className="endangered-list-link">
        <div className="endangered-list-thumb">
          {recipe.image ? (
            <img src={recipe.image} alt="" className="endangered-list-image" />
          ) : (
            <div className="endangered-list-placeholder" aria-hidden="true" />
          )}
        </div>
        <div className="endangered-list-meta">
          <div className="endangered-list-meta-top">
            <HeritageStatusBadge status={recipe.heritage_status} />
            {recipe.region_name && (
              <span className="endangered-list-region">📍 {recipe.region_name}</span>
            )}
          </div>
          <h3 className="endangered-list-title">{recipe.title}</h3>
          {recipe.author_username && (
            <p className="endangered-list-author">@{recipe.author_username}</p>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function EndangeredListPage() {
  const [status, setStatus] = useState('endangered');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchRecipesByHeritageStatus(status)
      .then((data) => { if (!cancelled) setRecipes(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError('Could not load endangered recipes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status]);

  return (
    <main className="page-card endangered-page">
      <header className="endangered-page-header">
        <h1>Endangered &amp; heritage recipes</h1>
        <p className="endangered-page-subtitle">
          Dishes flagged at risk, actively preserved, or revived by their
          communities. Cook them, share them, keep them on the table.
        </p>
        <div className="endangered-page-tabs" role="tablist" aria-label="Heritage status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={status === f.key}
              className={`endangered-page-tab${status === f.key ? ' is-active' : ''}`}
              onClick={() => setStatus(f.key)}
            >
              <HeritageStatusBadge status={f.key} />
              <span className="endangered-page-tab-label">{f.label}</span>
            </button>
          ))}
        </div>
      </header>

      {loading && <p className="endangered-page-status">Loading…</p>}
      {error && (
        <p className="endangered-page-status endangered-page-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && recipes.length === 0 && (
        <p className="endangered-page-status">
          No recipes flagged as {STATUS_FILTERS.find((f) => f.key === status)?.label.toLowerCase()} yet.
        </p>
      )}
      {!loading && !error && recipes.length > 0 && (
        <ul className="endangered-list">
          {recipes.map((r) => <RecipeRow key={r.id} recipe={r} />)}
        </ul>
      )}
    </main>
  );
}
