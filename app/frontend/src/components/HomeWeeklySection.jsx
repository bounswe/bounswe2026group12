import { useEffect, useState } from 'react';
import { fetchFeaturedRecipes } from '../services/recipeService';
import { fetchFeaturedStories } from '../services/storyService';
import HomeRail from './HomeRail';

export default function HomeWeeklySection() {
  const [recipes, setRecipes] = useState([]);
  const [stories, setStories] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState('');
  const [storiesError, setStoriesError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchFeaturedRecipes(6),
      fetchFeaturedStories(6),
    ]).then(([r, s]) => {
      if (cancelled) return;
      if (r.status === 'fulfilled') setRecipes(Array.isArray(r.value) ? r.value : []);
      else setRecipesError('Could not load recipes.');
      if (s.status === 'fulfilled') setStories(Array.isArray(s.value) ? s.value : []);
      else setStoriesError('Could not load stories.');
      setRecipesLoading(false);
      setStoriesLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <HomeRail
        title="This week's recipes"
        subtitle="Fresh from the community"
        items={recipes}
        loading={recipesLoading}
        error={recipesError}
        moreHref="/recipes"
        getHref={(r) => `/recipes/${r.id}`}
        emptyHint="No recipes yet — share the first one!"
      />
      <HomeRail
        title="This week's stories"
        subtitle="Voices behind the plates"
        items={stories}
        loading={storiesLoading}
        error={storiesError}
        moreHref="/stories"
        getHref={(s) => `/stories/${s.id}`}
        emptyHint="No stories yet — share the first one!"
      />
    </>
  );
}
