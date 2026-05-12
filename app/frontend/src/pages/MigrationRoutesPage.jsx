import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchIngredientRoutes } from '../services/ingredientRouteService';
import './MigrationRoutesPage.css';

const DEFAULT_CENTER = [25, 15];
const DEFAULT_ZOOM = 2;
const ANIMATION_STEP_MS = 650;

/**
 * Coerce a waypoint shape into `{ lat, lng, era, label }` with numeric coords
 * or null when the payload is broken. Backend ships a JSONField, so we never
 * fully trust the structure.
 */
function normaliseWaypoint(raw) {
  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    era: typeof raw?.era === 'string' ? raw.era : '',
    label: typeof raw?.label === 'string' ? raw.label : '',
  };
}

function normaliseRoute(route) {
  const waypoints = Array.isArray(route?.waypoints)
    ? route.waypoints.map(normaliseWaypoint).filter(Boolean)
    : [];
  return {
    id: route?.id,
    ingredient: route?.ingredient,
    ingredient_name: route?.ingredient_name || `Ingredient #${route?.ingredient ?? '?'}`,
    waypoints,
  };
}

export default function MigrationRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [animatedCount, setAnimatedCount] = useState(null); // null => static
  const animationTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchIngredientRoutes()
      .then((data) => {
        if (cancelled) return;
        const cleaned = (data || []).map(normaliseRoute).filter((r) => r.waypoints.length >= 2);
        setRoutes(cleaned);
        if (cleaned.length > 0) setSelectedId(cleaned[0].id);
      })
      .catch(() => { if (!cancelled) setError('Could not load migration routes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Clear any pending animation timer when the page unmounts or the route
  // selection flips — we never want a stale tick advancing into a different
  // ingredient's waypoints.
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setAnimatedCount(null);
  }, [selectedId]);

  const selected = useMemo(
    () => routes.find((r) => r.id === selectedId) || null,
    [routes, selectedId],
  );

  const visibleWaypoints = useMemo(() => {
    if (!selected) return [];
    if (animatedCount === null) return selected.waypoints;
    return selected.waypoints.slice(0, animatedCount);
  }, [selected, animatedCount]);

  function startAnimation() {
    if (!selected || selected.waypoints.length < 2) return;
    if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    setAnimatedCount(1);
    animationTimerRef.current = setInterval(() => {
      setAnimatedCount((current) => {
        const next = (current ?? 0) + 1;
        if (next >= selected.waypoints.length) {
          if (animationTimerRef.current) {
            clearInterval(animationTimerRef.current);
            animationTimerRef.current = null;
          }
          return selected.waypoints.length;
        }
        return next;
      });
    }, ANIMATION_STEP_MS);
  }

  function resetAnimation() {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setAnimatedCount(null);
  }

  const polylinePositions = visibleWaypoints.map((w) => [w.lat, w.lng]);
  const mapCenter = selected?.waypoints?.[0]
    ? [selected.waypoints[0].lat, selected.waypoints[0].lng]
    : DEFAULT_CENTER;

  return (
    <main className="page-card migration-routes-page">
      <header className="migration-routes-header">
        <h1>Ingredient migration routes</h1>
        <p className="migration-routes-subtitle">
          How everyday ingredients travelled across the world, from their
          earliest known origins to the kitchens we cook in today.
        </p>
      </header>

      {loading && <p className="migration-routes-status">Loading routes…</p>}
      {error && (
        <p className="migration-routes-status migration-routes-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && routes.length === 0 && (
        <p className="migration-routes-status">
          No ingredient migration routes have been curated yet.
        </p>
      )}

      {!loading && !error && routes.length > 0 && (
        <div className="migration-routes-layout">
          <aside className="migration-routes-picker" aria-label="Pick an ingredient">
            <label htmlFor="ingredient-picker" className="migration-routes-picker-label">
              Ingredient
            </label>
            <select
              id="ingredient-picker"
              className="migration-routes-picker-select"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.ingredient_name}</option>
              ))}
            </select>

            <div className="migration-routes-anim-controls">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={startAnimation}
                disabled={!selected || selected.waypoints.length < 2}
              >
                ▶ Animate route
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={resetAnimation}
                disabled={animatedCount === null}
              >
                Reset
              </button>
            </div>

            {selected && (
              <div className="migration-routes-waypoint-list">
                <h2 className="migration-routes-waypoint-list-heading">Waypoints</h2>
                <ol>
                  {selected.waypoints.map((wp, i) => {
                    const isReached =
                      animatedCount === null || i < animatedCount;
                    return (
                      <li
                        key={`${wp.label}-${i}`}
                        className={`migration-routes-waypoint${isReached ? '' : ' is-pending'}`}
                      >
                        <span className="migration-routes-waypoint-era">{wp.era || '—'}</span>
                        <span className="migration-routes-waypoint-label">{wp.label || `${wp.lat.toFixed(1)}, ${wp.lng.toFixed(1)}`}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </aside>

          <div className="migration-routes-map-wrap">
            <MapContainer
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              className="migration-routes-leaflet"
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {polylinePositions.length >= 2 && (
                <Polyline
                  positions={polylinePositions}
                  pathOptions={{ color: '#C4521E', weight: 3, opacity: 0.85 }}
                />
              )}
              {visibleWaypoints.map((wp, i) => (
                <CircleMarker
                  key={`wp-${selected?.id}-${i}`}
                  center={[wp.lat, wp.lng]}
                  radius={i === 0 ? 9 : 7}
                  pathOptions={{
                    color: '#A3401A',
                    fillColor: i === 0 ? '#C4521E' : '#FAF7EF',
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="migration-routes-popup">
                      <strong className="migration-routes-popup-label">
                        {wp.label || `${wp.lat.toFixed(2)}, ${wp.lng.toFixed(2)}`}
                      </strong>
                      {wp.era && (
                        <span className="migration-routes-popup-era">{wp.era}</span>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}
    </main>
  );
}
