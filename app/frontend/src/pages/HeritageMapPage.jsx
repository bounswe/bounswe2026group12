import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchHeritageGroup } from '../services/heritageService';
import { groupByRegion, topRegion } from '../utils/heritageMidpoint';
import './HeritageMapPage.css';

const centerIcon = L.divIcon({
  className: 'heritage-center-icon',
  html: '<span aria-hidden="true">🏛</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function HeritageMapPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHeritageGroup(id)
      .then((data) => { if (!cancelled) setGroup(data); })
      .catch(() => { if (!cancelled) setError('Could not load heritage group.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!group) return null;

  const regionGroups = groupByRegion(group.members);
  const center = topRegion(regionGroups);
  const otherRegions = center ? regionGroups.filter((rg) => rg !== center) : [];

  const recipes = selectedRegion?.members.filter((m) => m.content_type === 'recipe') ?? [];
  const stories = selectedRegion?.members.filter((m) => m.content_type === 'story') ?? [];

  return (
    <main className="heritage-map-page">
      <header className="heritage-map-header">
        <Link to={`/heritage/${group.id}`} className="btn btn-outline btn-sm">
          ← Back to Heritage Page
        </Link>
        <div className="heritage-map-title-block">
          <span className="heritage-map-eyebrow">🏛 Heritage Map</span>
          <h1 className="heritage-map-title">{group.name}</h1>
        </div>
      </header>

      {center ? (
        <div className="heritage-map-layout">
          <div className="heritage-map-wrap">
            <MapContainer
              center={center.coords}
              zoom={4}
              className="heritage-map-leaflet"
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {otherRegions.map((rg) => (
                <Polyline
                  key={`line-${rg.region}`}
                  positions={[center.coords, rg.coords]}
                  pathOptions={{ color: '#C4521E', weight: 2, opacity: 0.65, dashArray: '4 4' }}
                />
              ))}
              <Marker
                position={center.coords}
                icon={centerIcon}
                eventHandlers={{ click: () => setSelectedRegion(center) }}
              >
                <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                  {center.region}
                </Tooltip>
              </Marker>
              {otherRegions.map((rg) => (
                <CircleMarker
                  key={`pin-${rg.region}`}
                  center={rg.coords}
                  radius={10}
                  pathOptions={{
                    color: '#A3401A',
                    fillColor: '#FAF7EF',
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelectedRegion(rg) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    {rg.region}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <aside className="heritage-map-panel">
            {selectedRegion ? (
              <>
                <h2 className="heritage-map-panel-title">{selectedRegion.region}</h2>
                <p className="heritage-map-panel-subtitle">in {group.name}</p>

                {recipes.length > 0 && (
                  <section className="heritage-map-panel-section">
                    <h3>Recipes</h3>
                    <ul className="map-content-list">
                      {recipes.map((r) => (
                        <li key={r.id}>
                          <Link to={`/recipes/${r.id}`} className="map-content-item">
                            <span className="map-content-title">{r.title}</span>
                            <span className="map-content-author">@{r.author}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {stories.length > 0 && (
                  <section className="heritage-map-panel-section">
                    <h3>Stories</h3>
                    <ul className="map-content-list">
                      {stories.map((s) => (
                        <li key={s.id}>
                          <Link to={`/stories/${s.id}`} className="map-content-item">
                            <span className="map-content-title">{s.title}</span>
                            <span className="map-content-author">@{s.author}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {recipes.length === 0 && stories.length === 0 && (
                  <p className="map-panel-empty">No content for this region yet.</p>
                )}
              </>
            ) : (
              <p className="map-panel-empty">Select a region pin to explore its heritage content.</p>
            )}
          </aside>
        </div>
      ) : (
        <p className="heritage-map-empty">No locations to plot for this heritage group yet.</p>
      )}
    </main>
  );
}
