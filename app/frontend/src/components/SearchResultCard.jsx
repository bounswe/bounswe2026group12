import { Link } from 'react-router-dom';

export default function SearchResultCard({ result }) {
  const { type, id, title, region } = result;
  const href = type === 'recipe' ? `/recipes/${id}` : `/stories/${id}`;

  return (
    <article>
      <Link to={href}>
        <span>{type}</span>
        <h3>{title}</h3>
        {region && <span>{region}</span>}
      </Link>
    </article>
  );
}
