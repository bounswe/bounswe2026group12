import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchMapRegions } from '../services/mapService';
import { fetchRecipesByRegion } from '../services/recipeService';
import { fetchStoriesByRegion } from '../services/storyService';
import './MapPage.css';

export default function MapPage() {
  const [regions, setRegions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const currentRegionName = useRef(null);

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
    currentRegionName.current = region.name;
    Promise.allSettled([
      fetchRecipesByRegion(region.name),
      fetchStoriesByRegion(region.name),
    ]).then(([r, s]) => {
      if (currentRegionName.current !== region.name) return;
      setRecipes(r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);
      setStories(s.status === 'fulfilled' && Array.isArray(s.value) ? s.value : []);
      setContentLoading(false);
    });
  }

  const hasCoords = (it) =>
    it.latitude !== null && it.latitude !== undefined &&
    it.longitude !== null && it.longitude !== undefined &&
    Number.isFinite(Number(it.latitude)) && Number.isFinite(Number(it.longitude));
  const locatedRecipes   = recipes.filter(hasCoords);
  const unlocatedRecipes = recipes.filter((r) => !hasCoords(r));
  const locatedStories   = stories.filter(hasCoords);
  const unlocatedStories = stories.filter((s) => !hasCoords(s));
  const unlocatedCount   = unlocatedRecipes.length + unlocatedStories.length;

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
                  key={`region-${region.id}`}
                  center={[region.latitude, region.longitude]}
                  radius={selected?.id === region.id ? 16 : 11}
                  pathOptions={{
                    color: selected?.id === region.id ? '#5A2410' : '#C4521E',
                    fillColor: selected?.id === region.id ? '#7A2E14' : '#FAF7EF',
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
              {locatedRecipes.map((r) => (
                <CircleMarker
                  key={`recipe-${r.id}`}
                  center={[Number(r.latitude), Number(r.longitude)]}
                  radius={7}
                  pathOptions={{
                    color: '#A3401A',
                    fillColor: '#C4521E',
                    fillOpacity: 0.9,
                    weight: 1.5,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    <Link to={`/recipes/${r.id}`} className="map-pin-link">{r.title}</Link>
                  </Tooltip>
                </CircleMarker>
              ))}
              {locatedStories.map((s) => (
                <CircleMarker
                  key={`story-${s.id}`}
                  center={[Number(s.latitude), Number(s.longitude)]}
                  radius={7}
                  pathOptions={{
                    color: '#1F5959',
                    fillColor: '#2E7D7D',
                    fillOpacity: 0.9,
                    weight: 1.5,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    <Link to={`/stories/${s.id}`} className="map-pin-link">{s.title}</Link>
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
              <p className="map-panel-counts">
                {`${locatedRecipes.length} ${locatedRecipes.length === 1 ? 'recipe' : 'recipes'} + ${locatedStories.length} ${locatedStories.length === 1 ? 'story' : 'stories'} on map · ${unlocatedCount} without a location`}
              </p>

              {contentLoading && <p className="map-panel-empty">Loading…</p>}

              {!contentLoading && unlocatedCount > 0 && (
                <section className="map-panel-section">
                  <h3>No coordinates</h3>
                  <ul className="map-content-list">
                    {unlocatedRecipes.map((r) => (
                      <li key={`ur-${r.id}`}>
                        <Link to={`/recipes/${r.id}`} className="map-content-item">
                          <span className="map-content-title">{r.title}</span>
                          <span className="map-content-author">@{r.author_username}</span>
                        </Link>
                      </li>
                    ))}
                    {unlocatedStories.map((s) => (
                      <li key={`us-${s.id}`}>
                        <Link to={`/stories/${s.id}`} className="map-content-item map-content-item-story">
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
