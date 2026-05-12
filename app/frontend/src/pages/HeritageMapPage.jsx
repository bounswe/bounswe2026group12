import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchHeritageGroup } from '../services/heritageService';
import { computeHeritageMidpoint, locatableMembers } from '../utils/heritageMidpoint';
import './HeritageMapPage.css';

const centerIcon = L.divIcon({
  className: 'heritage-center-icon',
  html: '<span aria-hidden="true">🏛</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function HeritageMapPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const located = locatableMembers(group.members);
  const midpoint = computeHeritageMidpoint(group.members);

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

      {midpoint ? (
        <div className="heritage-map-wrap">
          <MapContainer
            center={midpoint}
            zoom={4}
            className="heritage-map-leaflet"
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {located.map((member) => (
              <Polyline
                key={`line-${member.content_type}-${member.id}`}
                positions={[midpoint, [member.latitude, member.longitude]]}
                pathOptions={{ color: '#C4521E', weight: 2, opacity: 0.65, dashArray: '4 4' }}
              />
            ))}
            <Marker
              position={midpoint}
              icon={centerIcon}
              eventHandlers={{ click: () => navigate(`/heritage/${group.id}`) }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                {group.name}
              </Tooltip>
            </Marker>
            {located.map((member) => (
              <CircleMarker
                key={`pin-${member.content_type}-${member.id}`}
                center={[member.latitude, member.longitude]}
                radius={10}
                pathOptions={{
                  color: '#A3401A',
                  fillColor: member.content_type === 'recipe' ? '#C4521E' : '#8C4A1C',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () =>
                    navigate(
                      `/${member.content_type === 'recipe' ? 'recipes' : 'stories'}/${member.id}`,
                    ),
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  {member.content_type === 'recipe' ? '🍲 ' : '📖 '}{member.title}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <p className="heritage-map-empty">No locations to plot for this heritage group yet.</p>
      )}
    </main>
  );
}
