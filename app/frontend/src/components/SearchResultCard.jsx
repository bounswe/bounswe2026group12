import { Link } from 'react-router-dom';

export default function SearchResultCard({ result }) {
  const { type, id, title, region, thumbnail } = result;
  const href = type === 'recipe' ? `/recipes/${id}` : `/stories/${id}`;

  return (
    <article>
      <Link to={href}>
        <span className="result-type">{type}</span>
        {thumbnail && <img src={thumbnail} alt={title} />}
        <h3>{title}</h3>
        {region && <span className="result-region">{region}</span>}
      </Link>
    </article>
  );
}
