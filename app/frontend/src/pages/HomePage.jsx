import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRegions } from '../services/searchService';

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [language, setLanguage] = useState('');
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}&region=${encodeURIComponent(region)}&language=${encodeURIComponent(language)}`);
  }

  return (
    <main>
      <h1>Home</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="search-input">Search</label>
        <input
          id="search-input"
          role="searchbox"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search recipes and stories…"
        />

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

        <label htmlFor="language-select">Language</label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="">All languages</option>
          <option value="en">English</option>
          <option value="tr">Turkish</option>
        </select>

        <button type="submit">Search</button>
      </form>
    </main>
  );
}
