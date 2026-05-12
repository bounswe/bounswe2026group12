import { Link } from 'react-router-dom';
import './HomeRail.css';

export default function HomeRail({
  title,
  subtitle,
  items = [],
  loading = false,
  error = '',
  moreHref,
  getHref,
  emptyHint = 'Nothing here yet.',
}) {
  return (
    <section className="home-rail" aria-label={title}>
      <div className="home-rail-header">
        <div>
          <h2 className="home-rail-title">{title}</h2>
          {subtitle && <p className="home-rail-subtitle">{subtitle}</p>}
        </div>
        {moreHref && (
          <Link to={moreHref} className="home-rail-more">More →</Link>
        )}
      </div>

      {error ? (
        <p className="home-rail-error" role="alert">{error}</p>
      ) : loading ? (
        <ul className="home-rail-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="home-rail-skeleton" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="home-rail-empty">{emptyHint}</p>
      ) : (
        <ul className="home-rail-grid">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={getHref(item)} className="home-rail-card">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="home-rail-card-img" />
                ) : (
                  <div className="home-rail-card-placeholder" aria-hidden="true" />
                )}
                <span className="home-rail-card-title">{item.title}</span>
                {(item.region_name || item.author_username) && (
                  <span className="home-rail-card-meta">
                    {item.region_name && <span>{item.region_name}</span>}
                    {item.region_name && item.author_username && ' · '}
                    {item.author_username && <span>@{item.author_username}</span>}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
