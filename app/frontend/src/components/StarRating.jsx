import { useState } from 'react';
import './StarRating.css';

/**
 * Five-star rating widget (#736). Two modes:
 *
 *   - **Interactive**: `onChange(score)` provided and `disabledReason` is empty.
 *     Click a star to set; click the currently-set star again to unrate
 *     (`onChange(null)`). Hover preview tints stars up to the hover index.
 *
 *   - **Read-only**: no `onChange`, or `disabledReason` is non-empty. The
 *     `disabledReason` becomes the tooltip + accessible label.
 *
 * `userScore` (1-5 or null) is the current user's submitted rating; rendered
 * as filled stars. `average` (number, numeric string, or null) is the
 * aggregate; when `userScore` is missing, stars paint at the rounded average.
 * `count` shows in the trailing summary.
 */
export default function StarRating({
  userScore = null,
  average = null,
  count = 0,
  onChange,
  disabledReason = '',
  size = 'md',
}) {
  const [hover, setHover] = useState(null);
  const interactive = typeof onChange === 'function' && !disabledReason;

  const numericAverage = (() => {
    const value = typeof average === 'string' ? parseFloat(average) : average;
    return Number.isFinite(value) ? value : null;
  })();

  const displayScore =
    hover != null
      ? hover
      : typeof userScore === 'number' && userScore > 0
      ? userScore
      : numericAverage != null
      ? Math.round(numericAverage)
      : 0;

  function handleClick(value) {
    if (!interactive) return;
    onChange(userScore === value ? null : value);
  }

  const tooltip = disabledReason
    ? disabledReason
    : interactive
    ? userScore
      ? `Your rating: ${userScore} of 5`
      : 'Click a star to rate'
    : numericAverage != null
    ? `${numericAverage.toFixed(1)} of 5 from ${count} rating${count === 1 ? '' : 's'}`
    : 'Not rated yet';

  return (
    <span
      className={`star-rating star-rating-${size}${interactive ? ' interactive' : ''}`}
      title={tooltip}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={tooltip}
    >
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = displayScore >= value;
        if (interactive) {
          return (
            <button
              key={value}
              type="button"
              className={`star-rating-star${filled ? ' filled' : ''}`}
              onClick={() => handleClick(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(value)}
              onBlur={() => setHover(null)}
              role="radio"
              aria-checked={userScore === value}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
            >
              ★
            </button>
          );
        }
        return (
          <span
            key={value}
            className={`star-rating-star${filled ? ' filled' : ''}`}
            aria-hidden="true"
          >
            ★
          </span>
        );
      })}
      {numericAverage != null && count > 0 && (
        <span className="star-rating-summary">
          {numericAverage.toFixed(1)} ({count})
        </span>
      )}
      {numericAverage == null && count === 0 && !interactive && (
        <span className="star-rating-summary star-rating-summary-empty">Not rated</span>
      )}
    </span>
  );
}
