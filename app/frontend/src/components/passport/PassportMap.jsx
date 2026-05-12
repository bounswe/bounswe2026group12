import { useState } from 'react';
import { getRegionFill } from '../../utils/passportMapColors';
import './PassportMap.css';

// Minimal SVG world map — simplified rectangles per macro-region for demo
// Replace with a proper SVG asset once available
const REGIONS = [
  { id: 'europe',        label: 'Europe',          x: 440, y: 80,  w: 80, h: 60  },
  { id: 'middle_east',   label: 'Middle East',      x: 530, y: 120, w: 60, h: 50  },
  { id: 'central_asia',  label: 'Central Asia',     x: 590, y: 80,  w: 80, h: 60  },
  { id: 'east_asia',     label: 'East Asia',        x: 670, y: 80,  w: 80, h: 70  },
  { id: 'south_asia',    label: 'South Asia',       x: 610, y: 140, w: 60, h: 50  },
  { id: 'southeast_asia',label: 'Southeast Asia',   x: 680, y: 150, w: 70, h: 50  },
  { id: 'africa',        label: 'Africa',           x: 450, y: 150, w: 90, h: 100 },
  { id: 'north_america', label: 'North America',    x: 100, y: 80,  w: 160, h: 100},
  { id: 'latin_america', label: 'Latin America',    x: 150, y: 190, w: 100, h: 110},
  { id: 'oceania',       label: 'Oceania',          x: 700, y: 220, w: 100, h: 70 },
];

export default function PassportMap({ cultures }) {
  const [hovered, setHovered] = useState(null);

  const cultureMap = {};
  if (cultures) {
    cultures.forEach(c => {
      const key = c.name.toLowerCase().replace(/\s+/g, '_');
      cultureMap[key] = c;
    });
  }

  return (
    <div className="passport-map-wrapper">
      <svg
        viewBox="0 0 860 320"
        className="passport-map-svg"
        role="img"
        aria-label="Cultural passport world map"
      >
        <rect width="860" height="320" fill="#d4e9f7" rx="8" />
        {REGIONS.map(region => {
          const culture = cultureMap[region.id];
          const { fill, star } = getRegionFill(culture);
          return (
            <g key={region.id}>
              <rect
                x={region.x} y={region.y} width={region.w} height={region.h}
                fill={fill}
                stroke="#fff"
                strokeWidth="1.5"
                rx="4"
                className="passport-map-region"
                onMouseEnter={() => setHovered({ region, culture })}
                onMouseLeave={() => setHovered(null)}
              />
              {star && (
                <text x={region.x + region.w / 2} y={region.y + region.h / 2 + 5} textAnchor="middle" fontSize="14">⭐</text>
              )}
              <text
                x={region.x + region.w / 2}
                y={region.y + region.h - 6}
                textAnchor="middle"
                fontSize="8"
                fill="#3D1500"
                opacity="0.7"
              >
                {region.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="passport-map-popover">
          <strong>{hovered.region.label}</strong>
          {hovered.culture ? (
            <>
              <span>{hovered.culture.stamp_rarity} stamp</span>
              <span>{hovered.culture.recipe_count} recipes · {hovered.culture.story_count} stories</span>
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
