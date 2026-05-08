import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchMapRegions } from '../services/mapService';
import { getRegionTheme } from '../data/regionThemes';
import './MapPage.css';

export default function MapPage() {
  const [regions, setRegions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMapRegions()
      .then((data) => {
        setRegions(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const theme = selected ? getRegionTheme(selected.name) : {};
  // Extract only CSS variable entries (keys starting with --) for inline style
  const themeVars = Object.fromEntries(
    Object.entries(theme).filter(([k]) => k.startsWith('--'))
  );

  return (
    <div className="map-page" style={themeVars}>
      <div className="map-page-header">
        <div className="map-page-accent-bar" aria-hidden="true" />
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
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {regions.map((region) => {
                const isActive = selected?.id === region.id;
                const markerTheme = getRegionTheme(region.name);
                return (
                <CircleMarker
                  key={region.id}
                  center={[region.lat, region.lng]}
                  radius={isActive ? 16 : 11}
                  pathOptions={{
                    color: markerTheme['--rt-primary-hover'] ?? '#A3401A',
                    fillColor: isActive ? (markerTheme['--rt-marker-fill'] ?? '#C4521E') : '#FAF7EF',
                    fillOpacity: isActive ? 0.9 : 0.7,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelected(region) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    {region.name}
                  </Tooltip>
                </CircleMarker>
                );
              })}
            </MapContainer>
          )}
          {loading && <div className="map-loading">Loading map…</div>}
        </div>

        <aside className="map-panel">
          {selected ? (
            <>
              <h2 className="map-panel-title">{selected.name}</h2>
              <p className="map-panel-desc">{selected.description}</p>

              {selected.featured_recipes?.length > 0 && (
                <section className="map-panel-section">
                  <h3>Recipes</h3>
                  <ul className="map-content-list">
                    {selected.featured_recipes.map((r) => (
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

              {selected.featured_stories?.length > 0 && (
                <section className="map-panel-section">
                  <h3>Stories</h3>
                  <ul className="map-content-list">
                    {selected.featured_stories.map((s) => (
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

              <Link
                to={`/search?region=${selected.id}`}
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
            onClick={() => setSelected(region)}
          >
            {region.name}
          </button>
        ))}
      </div>
    </div>
  );
}
