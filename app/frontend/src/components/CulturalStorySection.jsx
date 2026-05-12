import { CULTURAL_STORY_FIELDS, hasAnyCulturalStory } from './culturalStoryFields';
import './CulturalStorySection.css';

/**
 * Read-only "Beyond the Recipe" cultural story (#516) on the recipe detail
 * page. Renders only the narrative notes that the author actually filled in,
 * each as its own card. Returns null when none of the seven fields carry a
 * non-blank value, so a recipe with no story stays silent.
 */
export default function CulturalStorySection({ culturalContext }) {
  if (!hasAnyCulturalStory(culturalContext)) return null;

  return (
    <section className="cultural-story" aria-label="Cultural story">
      <header className="cultural-story-header">
        <h2 className="cultural-story-heading">Beyond the Recipe</h2>
        <p className="cultural-story-subheading">
          The cultural story of this dish, in the cook's own words.
        </p>
      </header>
      <ul className="cultural-story-cards">
        {CULTURAL_STORY_FIELDS.map((field) => {
          const value = typeof culturalContext[field.key] === 'string'
            ? culturalContext[field.key].trim()
            : '';
          if (!value) return null;
          return (
            <li key={field.key} className="cultural-story-card">
              <h3 className="cultural-story-card-label">{field.label}</h3>
              <p className="cultural-story-card-body">{value}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
