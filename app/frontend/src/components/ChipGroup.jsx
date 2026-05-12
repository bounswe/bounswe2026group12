import { Children, useMemo, useState } from 'react';
import './ChipGroup.css';

export default function ChipGroup({
  label,
  icon,
  visibleCount = 12,
  children,
  className = '',
  labelClassName = 'chip-group-label',
  itemsClassName = 'chip-group-items',
}) {
  const childArray = useMemo(
    () => Children.toArray(children).filter(Boolean),
    [children],
  );
  const total = childArray.length;
  const overflowing = total > visibleCount;

  const [userToggle, setUserToggle] = useState(null);
  const expanded = userToggle === null ? !overflowing : userToggle;

  const visibleChildren = expanded ? childArray : childArray.slice(0, visibleCount);
  const hiddenCount = total - visibleCount;

  return (
    <div className={`chip-group ${className}`.trim()}>
      <span className={labelClassName}>
        {icon ? (
          <span className="chip-group-icon" aria-hidden="true">{icon}</span>
        ) : null}
        {label}
      </span>
      <div className={itemsClassName}>
        {visibleChildren}
        {overflowing ? (
          <button
            type="button"
            className="chip-group-toggle"
            onClick={() => setUserToggle(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? `Show fewer ${label}` : `Show ${hiddenCount} more ${label}`}
          >
            {expanded ? 'Show less ▴' : `+ ${hiddenCount} more ▾`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
