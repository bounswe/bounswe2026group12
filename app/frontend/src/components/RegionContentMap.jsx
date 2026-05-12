import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { getRegionForCountry } from '../utils/countryRegions';
import './RegionContentMap.css';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const CREAM = { r: 0xFA, g: 0xF7, b: 0xEF }; // var(--color-surface)
const RUST  = { r: 0xC4, g: 0x52, b: 0x1E }; // var(--color-primary)

function toHex2(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

/**
 * Interpolate between cream (count = 0) and rust (count = max). Used to tint
 * each country by its region's total recipe + story content.
 */
export function fillFor(count, max) {
  if (!count || max <= 0) return '#FAF7EF';
  const ratio = Math.min(1, count / max);
  const r = CREAM.r + (RUST.r - CREAM.r) * ratio;
  const g = CREAM.g + (RUST.g - CREAM.g) * ratio;
  const b = CREAM.b + (RUST.b - CREAM.b) * ratio;
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`.toUpperCase();
}

/**
 * World map for the home page. Tints each country by how much culinary
 * content (`recipes + stories`) lives in the region it belongs to, shows a
 * hover popover, and routes to the region's search results on click.
 *
 * Country → region mapping comes from `utils/countryRegions.js`; countries
 * without a region render in neutral cream and are click-inert.
 */
export default function RegionContentMap({ regions = [] }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const byName = new Map(regions.map((r) => [r.name, r]));
  const maxCount = regions.reduce((m, r) => {
    const c = (r.content_count?.recipes ?? 0) + (r.content_count?.stories ?? 0);
    return Math.max(m, c);
  }, 0);

  function handleEnter(country) {
    const regionName = getRegionForCountry(country);
    const region = regionName ? byName.get(regionName) : null;
    if (region) {
      setHovered({
        name: region.name,
        recipes: region.content_count?.recipes ?? 0,
        stories: region.content_count?.stories ?? 0,
      });
    } else {
      setHovered({ unmapped: true, country });
    }
  }

  function handleClick(country) {
    const regionName = getRegionForCountry(country);
    if (!regionName) return;
    navigate(`/search?region=${encodeURIComponent(regionName)}`);
  }

  return (
    <div className="region-content-map">
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 150 }}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const country = geo.properties.name;
              const regionName = getRegionForCountry(country);
              const region = regionName ? byName.get(regionName) : null;
              const count = region
                ? (region.content_count?.recipes ?? 0) + (region.content_count?.stories ?? 0)
                : 0;
              const fill = region ? fillFor(count, maxCount) : '#FAF7EF';
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => handleEnter(country)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleClick(country)}
                  style={{
                    default: { fill, stroke: '#3D1500', strokeWidth: 0.4, outline: 'none' },
                    hover:   { fill, stroke: '#3D1500', strokeWidth: 0.8, outline: 'none', cursor: regionName ? 'pointer' : 'default' },
                    pressed: { fill, outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {hovered && (
        <div className="region-content-map-popover" role="status">
          {hovered.unmapped ? (
            <>
              <strong>{hovered.country}</strong>
              <span>Not part of a culinary region yet</span>
            </>
          ) : (
            <>
              <strong>{hovered.name}</strong>
              <span>{hovered.recipes} recipes · {hovered.stories} stories</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
