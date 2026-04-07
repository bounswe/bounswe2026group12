import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchRecipe } from '../services/recipeService';
import './RecipeDetailPage.css';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchRecipe(id)
      .then((data) => { if (!cancelled) setRecipe(data); })
      .catch(() => { if (!cancelled) setError('Could not load recipe.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!recipe) return null;

  const isAuthor = user && recipe.author && user.id === recipe.author.id;

  return (
    <main className="page-card recipe-detail">
      <div className="recipe-detail-header">
        <div>
          {recipe.region && <span className="recipe-region-tag">{recipe.region}</span>}
          <h1 className="recipe-title">{recipe.title}</h1>
        </div>
        {isAuthor && (
          <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-outline btn-sm">
            Edit
          </Link>
        )}
      </div>

      {recipe.video && (
        <video
          data-testid="recipe-video"
          controls
          src={recipe.video}
          className="recipe-video"
        />
      )}

      {recipe.description && (
        <p className="recipe-description">{recipe.description}</p>
      )}

      <section className="recipe-ingredients">
        <h2>Ingredients</h2>
        <ul className="ingredients-list">
          {recipe.ingredients.map((ri) => (
            <li key={ri.ingredient.id} className="ingredient-item">
              <span className="ingredient-name">{ri.ingredient.name}</span>
              <span className="ingredient-amount">{ri.amount} {ri.unit.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
