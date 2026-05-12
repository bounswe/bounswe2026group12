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
          <span className="timeline-icon" aria-hidden="true">{EVENT_ICONS[event.event_type] ?? '📌'}</span>
          <div className="timeline-body">
            <p className="timeline-description">
              {event.event_type?.replace('_', ' ')}
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
      ))}
    </ol>
  );
}
