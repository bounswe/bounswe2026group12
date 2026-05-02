import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchMapRegions } from '../services/mapService';
import { getRegionTheme } from '../data/regionThemes';
import RegionPanel from '../components/RegionPanel';
import './MapPage.css';

function NearestRegionTracker({ regions, onRegionChange }) {
  useMapEvents({
    moveend(e) {
      const center = e.target.getCenter();
      let nearest = null;
      let minDist = Infinity;
      regions.forEach((r) => {
        const d = Math.hypot(r.lat - center.lat, r.lng - center.lng);
        if (d < minDist) { minDist = d; nearest = r; }
      });
      if (nearest) onRegionChange(nearest);
    },
  });
  return null;
}

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
              <NearestRegionTracker regions={regions} onRegionChange={setSelected} />
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

        <RegionPanel region={selected} />
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
