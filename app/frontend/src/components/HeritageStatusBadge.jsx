import './HeritageStatusBadge.css';

const TREATMENT = {
  endangered: { emoji: '⚠️', label: 'Endangered', cls: 'heritage-status-endangered' },
  preserved:  { emoji: '🛡',  label: 'Preserved',  cls: 'heritage-status-preserved' },
  revived:    { emoji: '🌱',  label: 'Revived',    cls: 'heritage-status-revived' },
};

/**
 * Small chip rendering `Recipe.heritage_status` (#520). Renders nothing for
 * `none` / null / unknown values so callers can safely drop it inline.
 *
 * Colours: amber for endangered, green for preserved, blue for revived
 * (issue #520 spec).
 */
export default function HeritageStatusBadge({ status, size = 'sm' }) {
  if (!status || status === 'none') return null;
  const t = TREATMENT[status];
  if (!t) return null;
  return (
    <span
      className={`heritage-status-badge ${t.cls} heritage-status-${size}`}
      aria-label={`Heritage status: ${t.label}`}
      title={`Heritage status: ${t.label}`}
    >
      <span className="heritage-status-emoji" aria-hidden="true">{t.emoji}</span>
      <span className="heritage-status-label">{t.label}</span>
    </span>
  );
}
