import { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import worldTopology from 'world-atlas/countries-110m.json';
import { getRegionFill, MAP_FILLS } from '../../utils/passportMapColors';
import { buildCountryCultureIndex } from '../../utils/passportCultureRegions';
import './PassportMap.css';

/**
 * Cultural-passport world map. Uses Natural-Earth-derived country polygons
 * (via `world-atlas/countries-110m.json`) so the map reads as a real world
 * map. Each country's fill comes from how engaged the current user is with
 * the cultures that "claim" it: see `passportCultureRegions.js` for the
 * culture → country mapping.
 *
 * Backend `culture_summaries[]` is shaped
 *   { culture, recipes_tried, stories_saved, interactions, rarity }
 *
 * The component falls back gracefully to a clean unexplored map when
 * `cultures` is null, empty, or contains entries the mapping doesn't know
 * about — it never throws.
 */
export default function PassportMap({ cultures }) {
  const [hovered, setHovered] = useState(null);

  const countryIndex = buildCountryCultureIndex(cultures);

  return (
    <div className="passport-map-wrapper">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 150, center: [10, 15] }}
        width={900}
        height={420}
        className="passport-map-svg"
      >
        <Geographies geography={worldTopology}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties?.name ?? '';
              const entry = countryIndex[name];
              const culture = entry?.culture;
              const { fill, star } = culture
                ? getRegionFill(culture)
                : { fill: MAP_FILLS.default, star: false };
              const isHovered = hovered?.country === name;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth={0.4}
                  style={{
                    default:  { outline: 'none' },
                    hover:    { outline: 'none', fill, opacity: 0.85, cursor: 'pointer' },
                    pressed:  { outline: 'none' },
                  }}
                  onMouseEnter={() => setHovered({ country: name, culture, star })}
                  onMouseLeave={() => setHovered(null)}
                  data-hovered={isHovered ? 'true' : undefined}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {hovered && (
        <div className="passport-map-popover">
          <strong>{hovered.country || 'Unknown'}</strong>
          {hovered.culture ? (
            <>
              <span className="passport-map-popover-culture">
                {hovered.culture.name ?? hovered.culture.culture}
              </span>
              <span>
                {hovered.culture.rarity ?? hovered.culture.stamp_rarity} stamp
                {hovered.star ? ' ⭐' : ''}
              </span>
              <span>
                {hovered.culture.recipes_tried ?? hovered.culture.recipe_count ?? 0} recipes ·{' '}
                {hovered.culture.stories_saved ?? hovered.culture.story_count ?? 0} stories
              </span>
            </>
          ) : (
            <span>Not yet explored</span>
          )}
        </div>
      )}

      <div className="passport-map-legend">
        <span className="passport-map-legend-item" style={{ '--c': '#E8DDD0' }}>Unexplored</span>
        <span className="passport-map-legend-item" style={{ '--c': '#F4C49A' }}>Story saved</span>
        <span className="passport-map-legend-item" style={{ '--c': '#E09050' }}>Recipe tried</span>
        <span className="passport-map-legend-item" style={{ '--c': '#8B3A0F' }}>Heritage contributed</span>
      </div>
    </div>
  );
}
