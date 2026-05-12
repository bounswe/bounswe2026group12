import { useState } from 'react';
import CultureDetailPanel from './CultureDetailPanel';
import './CultureGrid.css';

export default function CultureGrid({ cultures }) {
  const [selected, setSelected] = useState(null);

  if (!cultures || cultures.length === 0) {
    return <p className="passport-empty">No cultures discovered yet. Try recipes from around the world!</p>;
  }

  return (
    <div className="culture-grid-wrapper">
      <div className="culture-grid">
        {cultures.map(culture => (
          <button
            key={culture.id}
            className={`culture-card${selected?.id === culture.id ? ' culture-card--active' : ''}`}
            onClick={() => setSelected(selected?.id === culture.id ? null : culture)}
            aria-expanded={selected?.id === culture.id}
          >
            <span className="culture-card-emblem">{culture.emblem}</span>
            <span className="culture-card-name">{culture.name}</span>
            <span className={`culture-card-rarity culture-card-rarity--${culture.stamp_rarity}`}>
              {culture.stamp_rarity}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <CultureDetailPanel culture={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
