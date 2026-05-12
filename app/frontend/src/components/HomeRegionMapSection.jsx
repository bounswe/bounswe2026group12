import { useEffect, useState } from 'react';
import { fetchMapRegions } from '../services/mapService';
import RegionContentMap from './RegionContentMap';
import './HomeRegionMapSection.css';

export default function HomeRegionMapSection() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMapRegions()
      .then((data) => { if (!cancelled) setRegions(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError('Could not load region map.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="home-region-map-section" aria-label="Explore by region">
      <div className="home-section-header">
        <h2>Explore by region</h2>
        <p>Hover any culinary region to see how many recipes and stories live there.</p>
      </div>
      {loading && <p className="home-region-map-status">Loading region map…</p>}
      {error && <p className="home-region-map-status home-region-map-error" role="alert">{error}</p>}
      {!loading && !error && <RegionContentMap regions={regions} />}
    </section>
  );
}
