import { Link } from 'react-router-dom';
import './SearchResultCard.css';

export default function SearchResultCard({ result }) {
  const { type, id, title, region, thumbnail } = result;
  const href = type === 'recipe' ? `/recipes/${id}` : `/stories/${id}`;
  const accentClass = type === 'recipe' ? 'card-accent-green' : 'card-accent-mustard';

  return (
    <article className="result-card">
      <Link to={href} className="result-card-link">
        <div className={`result-card-top ${accentClass}`}>
          {thumbnail
            ? <img src={thumbnail} alt={title} className="result-card-img" />
            : <div className="result-card-placeholder" />
          }
        </div>
        <div className="result-card-body">
          <span className="result-type">{type}</span>
          <h3 className="result-card-title">{title}</h3>
          {region && <span className="result-region">{region}</span>}
        </div>
      </Link>
    </article>
  );
}
