import { Link } from 'react-router-dom';
import './HeritageBadge.css';

export default function HeritageBadge({ heritageGroup }) {
  if (!heritageGroup) return null;

  return (
    <Link to={`/heritage/${heritageGroup.id}`} className="heritage-badge">
      <span className="heritage-badge-icon">🏛</span>
      <span className="heritage-badge-text">
        <span className="heritage-badge-label">Heritage</span>
        <span className="heritage-badge-name">{heritageGroup.name}</span>
      </span>
      <span className="heritage-badge-arrow">→</span>
    </Link>
  );
}
