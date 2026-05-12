import './CultureGrid.css';

const RARITY_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', emerald: 'Emerald', legendary: 'Legendary' };

export default function CultureDetailPanel({ culture, onClose }) {
  if (!culture) return null;

  return (
    <div className="culture-detail-panel" role="region" aria-label={`${culture.name} details`}>
      <div className="culture-detail-header">
        <span className="culture-detail-emblem">{culture.emblem}</span>
        <div>
          <h3 className="culture-detail-name">{culture.name}</h3>
          <span className="culture-detail-rarity">{RARITY_LABELS[culture.stamp_rarity] ?? culture.stamp_rarity} Stamp</span>
        </div>
        <button className="culture-detail-close" onClick={onClose} aria-label="Close culture details">×</button>
      </div>

      <div className="culture-detail-stats">
        <div className="culture-detail-stat"><span>{culture.recipe_count}</span> Recipes tried</div>
        <div className="culture-detail-stat"><span>{culture.story_count}</span> Stories saved</div>
        <div className="culture-detail-stat"><span>{culture.heritage_count}</span> Heritage shared</div>
        <div className="culture-detail-stat"><span>{culture.ingredients_count}</span> Ingredients discovered</div>
      </div>

      {culture.favorite_dish && (
        <p className="culture-detail-dish">Favourite dish: <strong>{culture.favorite_dish}</strong></p>
      )}

      <div className="culture-upgrade-bar">
        <span className="culture-upgrade-label">Upgrade progress</span>
        <div className="culture-upgrade-track">
          <div
            className="culture-upgrade-fill"
            style={{ width: `${Math.min(100, (culture.upgrade_progress / culture.upgrade_max) * 100)}%` }}
          />
        </div>
        <span className="culture-upgrade-pct">{culture.upgrade_progress}/{culture.upgrade_max}</span>
      </div>
    </div>
  );
}
