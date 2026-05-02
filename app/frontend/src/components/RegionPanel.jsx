import { useState } from 'react';
import { Link } from 'react-router-dom';
import './RegionPanel.css';

const TABS = ['recipes', 'stories'];

export default function RegionPanel({ region, onClose }) {
  const [tab, setTab] = useState('recipes');

  if (!region) {
    return (
      <aside className="region-panel region-panel--empty">
        <p className="region-panel-hint">Click a region on the map to explore its food culture.</p>
      </aside>
    );
  }

  const items = tab === 'recipes'
    ? (region.featured_recipes ?? [])
    : (region.featured_stories ?? []);

  const recipeCount = region.featured_recipes?.length ?? 0;
  const storyCount = region.featured_stories?.length ?? 0;

  return (
    <aside className="region-panel" key={region.id}>
      <div className="region-panel-header">
        <h2 className="region-panel-title">{region.name}</h2>
        {onClose && (
          <button className="region-panel-close" onClick={onClose} aria-label="Close panel">×</button>
        )}
      </div>

      <p className="region-panel-desc">{region.description}</p>

      <div className="region-panel-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`region-tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'recipes' ? 'Recipes' : 'Stories'}
            <span className="region-tab-count">
              {t === 'recipes' ? recipeCount : storyCount}
            </span>
          </button>
        ))}
      </div>

      <ul className="region-content-list">
        {items.length === 0 ? (
          <li className="region-content-empty">No {tab} yet for this region.</li>
        ) : (
          items.map((item) => {
            const href = tab === 'recipes' ? `/recipes/${item.id}` : `/stories/${item.id}`;
            return (
              <li key={item.id}>
                <Link to={href} className="region-content-item">
                  <span className="region-content-title">{item.title}</span>
                  <span className="region-content-author">@{item.author_username}</span>
                </Link>
              </li>
            );
          })
        )}
      </ul>

      <Link
        to={`/search?region=${region.id}`}
        className="btn btn-primary btn-sm region-panel-cta"
      >
        See all from {region.name}
      </Link>
    </aside>
  );
}
