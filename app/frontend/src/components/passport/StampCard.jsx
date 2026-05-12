import './StampGrid.css';

const RARITY_COLORS = {
  bronze:    '#CD7F32',
  silver:    '#C0C0C0',
  gold:      '#FFD700',
  emerald:   '#50C878',
  legendary: '#9B59B6',
};

export default function StampCard({ stamp }) {
  const borderColor = RARITY_COLORS[stamp.rarity] ?? '#E8DDD0';
  const isEarned = Boolean(stamp.earned_at);

  return (
    <div
      className={`stamp-card${!isEarned ? ' stamp-card--locked' : ''}`}
      style={{ '--stamp-rarity-color': borderColor }}
    >
      <div className="stamp-card-icon">{!isEarned ? '🔒' : '🏅'}</div>
      <div className="stamp-card-body">
        <span className="stamp-card-name">{stamp.culture}</span>
        {stamp.earned_at && (
          <span className="stamp-card-date">
            {new Date(stamp.earned_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </span>
        )}
        <span className="stamp-card-rarity">{stamp.rarity}</span>
      </div>
    </div>
  );
}
