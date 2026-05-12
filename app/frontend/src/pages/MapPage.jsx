import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchMapRegions, fetchMapRegionContent } from '../services/mapService';
import './MapPage.css';

export default function MapPage() {
  const [regions, setRegions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const currentRegionId = useRef(null);

  useEffect(() => {
    fetchMapRegions()
      .then((data) => {
        setRegions(data);
        if (data.length > 0) selectRegion(data[0]);
      })
      .catch(() => setLoadError('Could not load regions.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRegion(region) {
    setSelected(region);
    setContentLoading(true);
    currentRegionId.current = region.id;
    fetchMapRegionContent(region.id)
      .then((data) => {
        if (currentRegionId.current === region.id) setContent(data);
      })
      .catch(() => {
        if (currentRegionId.current === region.id) setContent([]);
      })
      .finally(() => {
        if (currentRegionId.current === region.id) setContentLoading(false);
      });
  }

  const recipes = content.filter((c) => c.content_type === 'recipe');
  const stories = content.filter((c) => c.content_type === 'story');

  return (
    <div className="map-page">
      <div className="map-page-header">
        <h1>Discover by Region</h1>
        <p className="map-page-subtitle">
          Explore recipes and stories from culinary regions around Turkey and beyond.
        </p>
      </div>

      <div className="map-layout">
        <div className="map-container-wrap">
          {!loading && (
            <MapContainer
              center={[39.0, 35.0]}
              zoom={5}
              className="leaflet-map"
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {regions.map((region) => (
                <CircleMarker
                  key={region.id}
                  center={[region.latitude, region.longitude]}
                  radius={selected?.id === region.id ? 16 : 11}
                  pathOptions={{
                    color: selected?.id === region.id ? '#A3401A' : '#C4521E',
                    fillColor: selected?.id === region.id ? '#C4521E' : '#FAF7EF',
                    fillOpacity: selected?.id === region.id ? 0.9 : 0.7,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => selectRegion(region) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    {region.name}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
          {loading && <div className="map-loading">Loading map…</div>}
          {loadError && <div className="map-loading map-error">{loadError}</div>}
        </div>

        <aside className="map-panel">
          {selected ? (
            <>
              <h2 className="map-panel-title">{selected.name}</h2>
              <div className="map-panel-counts">
                <span>{selected.content_count?.recipes ?? 0} recipes</span>
                <span>{selected.content_count?.stories ?? 0} stories</span>
              </div>

              {contentLoading && <p className="map-panel-empty">Loading…</p>}

              {!contentLoading && recipes.length > 0 && (
                <section className="map-panel-section">
                  <h3>Recipes</h3>
                  <ul className="map-content-list">
                    {recipes.map((r) => (
                      <li key={r.id}>
                        <Link to={`/recipes/${r.id}`} className="map-content-item">
                          <span className="map-content-title">{r.title}</span>
                          <span className="map-content-author">@{r.author_username}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!contentLoading && stories.length > 0 && (
                <section className="map-panel-section">
                  <h3>Stories</h3>
                  <ul className="map-content-list">
                    {stories.map((s) => (
                      <li key={s.id}>
                        <Link to={`/stories/${s.id}`} className="map-content-item">
                          <span className="map-content-title">{s.title}</span>
                          <span className="map-content-author">@{s.author_username}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!contentLoading && recipes.length === 0 && stories.length === 0 && (
                <p className="map-panel-empty">No content yet for this region.</p>
              )}

              <Link
                to={`/search?region=${encodeURIComponent(selected.name)}`}
                className="btn btn-primary btn-sm map-panel-cta"
              >
                See all from {selected.name}
              </Link>
            </>
          ) : (
            <p className="map-panel-empty">Select a region on the map to explore its food culture.</p>
          )}
        </aside>
      </div>

      <div className="map-region-chips">
        {regions.map((region) => (
          <button
            key={region.id}
            className={`map-region-chip${selected?.id === region.id ? ' active' : ''}`}
            onClick={() => selectRegion(region)}
          >
            {region.name}
          </button>
        ))}
      </div>
    </div>
  );
}
