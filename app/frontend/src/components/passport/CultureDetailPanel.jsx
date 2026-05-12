import './CultureGrid.css';

const RARITY_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', emerald: 'Emerald', legendary: 'Legendary' };

export default function CultureDetailPanel({ culture, onClose }) {
  if (!culture) return null;

  return (
    <div className="culture-detail-panel" role="region" aria-label={`${culture.culture} details`}>
      <div className="culture-detail-header">
        <div>
          <h3 className="culture-detail-name">{culture.culture}</h3>
          <span className="culture-detail-rarity">{RARITY_LABELS[culture.rarity] ?? culture.rarity} Stamp</span>
        </div>
        <button className="culture-detail-close" onClick={onClose} aria-label="Close culture details">×</button>
      </div>

      <div className="culture-detail-stats">
        <div className="culture-detail-stat"><span>{culture.recipes_tried ?? 0}</span> Recipes tried</div>
        <div className="culture-detail-stat"><span>{culture.stories_saved ?? 0}</span> Stories saved</div>
        <div className="culture-detail-stat"><span>{culture.interactions ?? 0}</span> Interactions</div>
      </div>
    </div>
  );
}
