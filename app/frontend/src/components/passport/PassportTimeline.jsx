import { Link } from 'react-router-dom';
import './PassportTimeline.css';

const EVENT_ICONS = {
  recipe_tried:    '🍽',
  story_saved:     '📖',
  stamp_earned:    '🏅',
  quest_completed: '🎯',
  heritage_shared: '🏛',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PassportTimeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="passport-empty">No passport events yet. Start exploring to build your timeline!</p>;
  }

  return (
    <ol className="passport-timeline">
      {events.map(event => {
        // Backend ships a human-readable `description` like
        // "Earned a bronze stamp for Black Sea" — prefer it over the raw
        // event_type slug. Fall back to the slug (with underscores swapped
        // for spaces) when the description is missing.
        const label = event.description
          || (typeof event.event_type === 'string'
            ? event.event_type.replace(/_/g, ' ')
            : 'event');
        return (
          <li key={event.id} className="timeline-event">
            <span className="timeline-icon" aria-hidden="true">{EVENT_ICONS[event.event_type] ?? '📌'}</span>
            <div className="timeline-body">
              <p className="timeline-description">
                {label}
                {event.related_recipe && (
                  <Link to={`/recipes/${event.related_recipe}`} className="timeline-link"> · Recipe #{event.related_recipe}</Link>
                )}
                {event.related_story && (
                  <Link to={`/stories/${event.related_story}`} className="timeline-link"> · Story #{event.related_story}</Link>
                )}
              </p>
              <time className="timeline-date" dateTime={event.timestamp}>{formatDate(event.timestamp)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
