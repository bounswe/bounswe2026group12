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
      {events.map(event => (
        <li key={event.id} className="timeline-event">
          <span className="timeline-icon" aria-hidden="true">{EVENT_ICONS[event.type] ?? '📌'}</span>
          <div className="timeline-body">
            <p className="timeline-description">
              {event.description}
              {event.recipe_id && (
                <Link to={`/recipes/${event.recipe_id}`} className="timeline-link"> · {event.recipe_title}</Link>
              )}
              {event.story_id && (
                <Link to={`/stories/${event.story_id}`} className="timeline-link"> · {event.story_title}</Link>
              )}
            </p>
            <time className="timeline-date" dateTime={event.date}>{formatDate(event.date)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}
