import StampCard from './StampCard';
import './StampGrid.css';

const CATEGORIES = ['Recipe', 'Story', 'Heritage', 'Exploration', 'Community'];

export default function StampGrid({ stamps }) {
  if (!stamps || stamps.length === 0) {
    return <p className="passport-empty">No stamps yet. Start exploring to earn your first stamp!</p>;
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = stamps.filter(s => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const ungrouped = stamps.filter(s => !CATEGORIES.includes(s.category));
  if (ungrouped.length > 0) grouped['Other'] = ungrouped;

  return (
    <div className="stamp-grid-wrapper">
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="stamp-category-section">
          <h3 className="stamp-category-title">{category}</h3>
          <div className="stamp-grid">
            {items.map(stamp => <StampCard key={stamp.id} stamp={stamp} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
