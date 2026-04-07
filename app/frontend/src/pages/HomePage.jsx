import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRegions } from '../services/searchService';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}&region=${encodeURIComponent(region)}`);
  }

  return (
    <main className="page-card home-page">
      <div className="home-hero">
        <h1 className="home-heading">Discover the<br />Recipes of Your Roots</h1>
        <p className="home-subheading">Preserve family recipes, share culinary stories, and connect across generations.</p>
      </div>

      <form className="home-search-form" onSubmit={handleSubmit}>
        <div className="home-search-row">
          <label htmlFor="search-input" className="sr-only">Search</label>
          <input
            id="search-input"
            role="searchbox"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes and stories…"
            className="home-search-input"
          />
          <button type="submit" className="btn btn-primary home-search-btn">Search</button>
        </div>

        <div className="home-filters">
          <div className="form-group home-filter-group">
            <label htmlFor="region-select">Region</label>
            <select
              id="region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r.regionId} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </main>
  );
}
