import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecipes } from '../services/recipeService';
import StarRating from '../components/StarRating';
import './RecipeListPage.css';

export default function RecipeListPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchRecipes()
      .then((data) => { if (!cancelled) setRecipes(data); })
      .catch(() => { if (!cancelled) setError('Could not load recipes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;

  return (
    <main className="page-card recipe-list">
      <h1 className="recipe-list-heading">Recipes</h1>
      {recipes.length === 0 && (
        <p className="recipe-list-empty">No recipes yet. Share the first one!</p>
      )}
      <div className="recipe-list-grid">
        {recipes.map((recipe) => (
          <article key={recipe.id} className="recipe-browse-card">
            <div className="recipe-browse-img-wrap">
              {recipe.image
                ? <img src={recipe.image} alt={recipe.title} className="recipe-browse-img" />
                : <div className="recipe-browse-placeholder" />
              }
            </div>
            <div className="recipe-browse-body">
              {recipe.region_name && (
                <span className="recipe-browse-region">{recipe.region_name}</span>
              )}
              <span
                className={`recipe-browse-bookmark${recipe.is_bookmarked ? ' active' : ''}`}
                aria-label={
                  recipe.is_bookmarked
                    ? `Bookmarked, ${recipe.bookmark_count ?? 0} saves`
                    : 'Not bookmarked'
                }
              >
                {recipe.is_bookmarked ? '🔖' : '🏷'}
              </span>
              <h2 className="recipe-browse-title">
                <Link to={`/recipes/${recipe.id}`} className="recipe-browse-link">{recipe.title}</Link>
              </h2>
              {recipe.author_username && (
                <p className="recipe-browse-author">By {recipe.author_username}</p>
              )}
              <div className="recipe-browse-rating">
                <StarRating
                  average={recipe.average_rating ?? null}
                  count={recipe.rating_count ?? 0}
                  size="sm"
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
