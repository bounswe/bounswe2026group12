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
  const progress = Math.min(stamp.progress ?? 0, stamp.max_progress ?? 1);
  const pct = stamp.max_progress > 0 ? (progress / stamp.max_progress) * 100 : 0;

  return (
    <div
      className={`stamp-card${stamp.locked ? ' stamp-card--locked' : ''}`}
      style={{ '--stamp-rarity-color': borderColor }}
    >
      <div className="stamp-card-icon">{stamp.locked ? '🔒' : '🏅'}</div>
      <div className="stamp-card-body">
        <span className="stamp-card-name">{stamp.name}</span>
        {stamp.earned_at && (
          <span className="stamp-card-date">
            {new Date(stamp.earned_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </span>
        )}
        <div className="stamp-card-progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemax={stamp.max_progress}>
          <div className="stamp-card-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="stamp-card-rarity">{stamp.rarity}</span>
      </div>
    </div>
  );
}
