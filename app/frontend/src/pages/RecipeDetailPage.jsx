import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchRecipe } from '../services/recipeService';

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

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!recipe) return null;

  const isAuthor = user && recipe.author && user.id === recipe.author.id;

  return (
    <main>
      <h1>{recipe.title}</h1>
      <p>{recipe.region}</p>

      {isAuthor && (
        <Link to={`/recipes/${recipe.id}/edit`}>Edit</Link>
      )}

      {recipe.video && (
        <video
          data-testid="recipe-video"
          controls
          src={recipe.video}
          style={{ maxWidth: '100%', marginBottom: '16px' }}
        />
      )}

      <p>{recipe.description}</p>

      <section>
        <h2>Ingredients</h2>
        <ul>
          {recipe.ingredients.map((ri) => (
            <li key={ri.ingredient.id}>
              <span>{ri.ingredient.name}</span>
              {' — '}
              <span>{ri.amount}</span>
              {' '}
              <span>{ri.unit.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
