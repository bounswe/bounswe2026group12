import './PassportStatsBar.css';

const LEVEL_COLORS = {
  1: { cls: 'level-bronze',    label: 'Bronze Explorer' },
  2: { cls: 'level-silver',    label: 'Silver Wanderer' },
  3: { cls: 'level-gold',      label: 'Gold Traveler' },
  4: { cls: 'level-emerald',   label: 'Emerald Voyager' },
  5: { cls: 'level-legendary', label: 'Legendary Master' },
  6: { cls: 'level-master',    label: 'World Kitchen Master' },
};

export default function PassportStatsBar({ stats, level }) {
  if (!stats) {
    return (
      <div className="passport-stats-bar passport-stats-bar--skeleton">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="passport-stat-skeleton" />
        ))}
      </div>
    );
  }

  const levelInfo = LEVEL_COLORS[level] ?? { cls: 'level-bronze', label: stats.level_name ?? `Level ${level}` };

  return (
    <div className="passport-stats-bar">
      <div className="passport-stat">
        <span className="passport-stat-value">{stats.cultures_count ?? 0}</span>
        <span className="passport-stat-label">Cultures</span>
      </div>
      <div className="passport-stat">
        <span className="passport-stat-value">{stats.recipes_tried ?? 0}</span>
        <span className="passport-stat-label">Recipes Tried</span>
      </div>
      <div className="passport-stat">
        <span className="passport-stat-value">{stats.stories_saved ?? 0}</span>
        <span className="passport-stat-label">Stories</span>
      </div>
      <div className="passport-stat">
        <span className="passport-stat-value">{stats.heritage_shared ?? 0}</span>
        <span className="passport-stat-label">Heritage</span>
      </div>
      <div className={`passport-level-badge ${levelInfo.cls}`}>
        <span className="passport-level-name">{levelInfo.label}</span>
      </div>
    </div>
  );
}
