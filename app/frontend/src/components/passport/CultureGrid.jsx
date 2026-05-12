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
        {cultures.map(entry => (
          <button
            key={entry.culture}
            className={`culture-card${selected?.culture === entry.culture ? ' culture-card--active' : ''}`}
            onClick={() => setSelected(selected?.culture === entry.culture ? null : entry)}
            aria-expanded={selected?.culture === entry.culture}
          >
            <span className="culture-card-name">{entry.culture}</span>
            <span className={`culture-card-rarity culture-card-rarity--${entry.rarity}`}>
              {entry.rarity}
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
