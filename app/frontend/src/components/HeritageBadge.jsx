import { Link } from 'react-router-dom';
import './HeritageBadge.css';

export default function HeritageBadge({ group }) {
  if (!group) return null;
  return (
    <Link
      to={`/heritage/${group.id}`}
      className="heritage-badge"
      aria-label={`Heritage: ${group.name}`}
    >
      <span className="heritage-badge-icon" aria-hidden="true">🏛</span>
      <span className="heritage-badge-label">
        <span className="heritage-badge-prefix">Heritage</span>
        <span className="heritage-badge-name">{group.name}</span>
      </span>
    </Link>
  );
}
