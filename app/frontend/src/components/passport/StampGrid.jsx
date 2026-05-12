import StampCard from './StampCard';
import './StampGrid.css';

// Backend ships `category` as lowercase ('recipe', 'story', …). Match
// case-insensitively and render the human-friendly label here.
const CATEGORIES = [
  { key: 'recipe', label: 'Recipe' },
  { key: 'story', label: 'Story' },
  { key: 'heritage', label: 'Heritage' },
  { key: 'exploration', label: 'Exploration' },
  { key: 'community', label: 'Community' },
];

export default function StampGrid({ stamps }) {
  if (!stamps || stamps.length === 0) {
    return <p className="passport-empty">No stamps yet. Start exploring to earn your first stamp!</p>;
  }

  const knownKeys = new Set(CATEGORIES.map((c) => c.key));
  const grouped = CATEGORIES.reduce((acc, { key, label }) => {
    const items = stamps.filter((s) => typeof s.category === 'string' && s.category.toLowerCase() === key);
    if (items.length > 0) acc[label] = items;
    return acc;
  }, {});

  const ungrouped = stamps.filter(
    (s) => typeof s.category !== 'string' || !knownKeys.has(s.category.toLowerCase()),
  );
  if (ungrouped.length > 0) grouped['Other'] = ungrouped;

  return (
    <div className="stamp-grid-wrapper">
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="stamp-category-section">
          <h3 className="stamp-category-title">{category}</h3>
          <div className="stamp-grid">
            {items.map((stamp) => <StampCard key={stamp.id} stamp={stamp} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
