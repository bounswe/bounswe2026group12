import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchHeritageGroup, fetchCulturalFacts } from '../services/heritageService';
import { extractApiError } from '../services/api';
import './HeritagePage.css';

// Fix Leaflet default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 6);
    }
  }, [map, points]);
  return null;
}

// Group members by region, return sorted by recipe count desc
function groupByRegion(members) {
  const map = {};
  for (const m of members) {
    if (!m.region || m.latitude == null || m.longitude == null) continue;
    if (!map[m.region]) {
      map[m.region] = { region: m.region, lat: m.latitude, lng: m.longitude, items: [] };
    }
    map[m.region].items.push(m);
  }
  const groups = Object.values(map);
  groups.sort((a, b) => {
    const aR = a.items.filter(i => i.content_type === 'recipe').length;
    const bR = b.items.filter(i => i.content_type === 'recipe').length;
    return bR - aR;
  });
  return groups;
}

export default function HeritagePage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [panelRegion, setPanelRegion] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchHeritageGroup(id),
      fetchCulturalFacts({ heritageGroupId: id }),
    ])
      .then(([g, f]) => { setGroup(g); setFacts(f); })
      .catch((err) => setError(extractApiError(err, 'Could not load heritage group.')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-status-error">{error}</p>;
  if (!group) return null;

  const recipes = group.members.filter(m => m.content_type === 'recipe');
  const stories = group.members.filter(m => m.content_type === 'story');
  const regionGroups = groupByRegion(group.members);
  const centerRegion = regionGroups[0] ?? null;
  const otherRegions = regionGroups.slice(1);
  const mapPoints = regionGroups.map(r => [r.lat, r.lng]);

  return (
    <main className="page-card heritage-page">

      {/* Header */}
      <div className="heritage-header">
        <span className="heritage-header-icon">🏛</span>
        <div>
          <h1 className="heritage-title">{group.name}</h1>
          {group.description && <p className="heritage-desc">{group.description}</p>}
        </div>
      </div>

      {/* Map toggle */}
      {regionGroups.length > 0 && (
        <button
          type="button"
          className="btn btn-outline heritage-map-btn"
          onClick={() => { setShowMap(v => !v); setPanelRegion(null); }}
        >
          {showMap ? 'Hide Map' : 'Show Heritage Map'}
        </button>
      )}

      {/* Heritage Map — #500 + #668 */}
      {showMap && (
        <div className="heritage-map-wrap">
          <MapContainer
            center={centerRegion ? [centerRegion.lat, centerRegion.lng] : [39, 35]}
            zoom={5}
            className="heritage-leaflet-map"
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {mapPoints.length > 0 && <FitBounds points={mapPoints} />}

            {/* Polylines: center → each region */}
            {centerRegion && otherRegions.map(r => (
              <Polyline
                key={r.region}
                positions={[[centerRegion.lat, centerRegion.lng], [r.lat, r.lng]]}
                pathOptions={{ color: '#C4521E', weight: 2, dashArray: '5 5', opacity: 0.7 }}
              />
            ))}

            {/* Center pin */}
            {centerRegion && (
              <CircleMarker
                center={[centerRegion.lat, centerRegion.lng]}
                radius={14}
                pathOptions={{ color: '#3d1500', fillColor: '#C4521E', fillOpacity: 0.9, weight: 2 }}
                eventHandlers={{ click: () => setPanelRegion(panelRegion?.region === centerRegion.region ? null : centerRegion) }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>🏛 {centerRegion.region}</Tooltip>
              </CircleMarker>
            )}

            {/* Other region pins */}
            {otherRegions.map(r => (
              <CircleMarker
                key={r.region}
                center={[r.lat, r.lng]}
                radius={9}
                pathOptions={{ color: '#C4521E', fillColor: '#FAF7EF', fillOpacity: 0.85, weight: 2 }}
                eventHandlers={{ click: () => setPanelRegion(panelRegion?.region === r.region ? null : r) }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>{r.region}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Region side panel */}
          {panelRegion && (
            <div className="heritage-map-panel">
              <div className="heritage-map-panel-header">
                <div>
                  <h3>{panelRegion.region}</h3>
                  <p className="heritage-map-panel-sub">in {group.name}</p>
                </div>
                <button type="button" className="heritage-panel-close" onClick={() => setPanelRegion(null)}>✕</button>
              </div>
              <ul className="heritage-map-panel-list">
                {panelRegion.items.map(item => (
                  <li key={`${item.content_type}-${item.id}`}>
                    <Link
                      to={item.content_type === 'recipe' ? `/recipes/${item.id}` : `/stories/${item.id}`}
                      className="heritage-panel-item"
                    >
                      <span className="heritage-panel-icon">{item.content_type === 'recipe' ? '🍽' : '📖'}</span>
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Content grid */}
      {(recipes.length > 0 || stories.length > 0) && (
        <section className="heritage-content">
          <h2>Content in this Heritage Group</h2>
          <div className="heritage-grid">
            {group.members.map(m => (
              <Link
                key={`${m.content_type}-${m.id}`}
                to={m.content_type === 'recipe' ? `/recipes/${m.id}` : `/stories/${m.id}`}
                className="heritage-card"
              >
                <span className="heritage-card-type">{m.content_type === 'recipe' ? '🍽' : '📖'}</span>
                <div className="heritage-card-body">
                  <span className="heritage-card-title">{m.title}</span>
                  {m.author && <span className="heritage-card-meta">by {m.author}</span>}
                  {m.region && <span className="heritage-card-meta">{m.region}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Heritage Journey — #515 */}
      {group.journey_steps && group.journey_steps.length > 0 && (
        <section className="heritage-journey">
          <h2>Heritage Journey</h2>
          <div className="heritage-journey-steps">
            {group.journey_steps.map((step, i) => (
              <div key={step.id} className="heritage-journey-step">
                <div className="heritage-journey-connector">
                  <span className="heritage-journey-dot" />
                  {i < group.journey_steps.length - 1 && <span className="heritage-journey-line" />}
                </div>
                <div className="heritage-journey-body">
                  <div className="heritage-journey-location">
                    {step.location}
                    {step.era && <span className="heritage-journey-era">{step.era}</span>}
                  </div>
                  <p className="heritage-journey-story">{step.story}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Did You Know — #517 */}
      {facts.length > 0 && (
        <section className="heritage-facts">
          <h2>Did You Know?</h2>
          <div className="heritage-facts-list">
            {facts.map(fact => (
              <div key={fact.id} className="heritage-fact-card">
                <span className="heritage-fact-icon">💡</span>
                <div className="heritage-fact-body">
                  <p>{fact.text}</p>
                  {fact.source_url && (
                    <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="heritage-fact-source">
                      Source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
