import './QuestList.css';

function formatDeadline(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function QuestItem({ quest }) {
  const completed = Boolean(quest.completed_at);
  const pct = quest.target_count > 0 ? Math.min(100, (quest.progress / quest.target_count) * 100) : 0;
  const rewardLabel = quest.reward_value ?? quest.reward_type ?? '';
  // Backend ships `event_end` for time-limited event quests; older mocks used
  // `deadline`. Accept either.
  const deadline = quest.event_end ?? quest.deadline ?? null;

  return (
    <div className={`quest-item${completed ? ' quest-item--done' : ''}`}>
      <div className="quest-header">
        <span className="quest-name">{quest.name}</span>
        {completed && <span className="quest-done-badge">✓ Done</span>}
      </div>
      <p className="quest-description">{quest.description}</p>
      {!completed && (
        <div className="quest-progress-bar" role="progressbar" aria-valuenow={quest.progress} aria-valuemax={quest.target_count}>
          <div className="quest-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="quest-meta">
        {rewardLabel && <span className="quest-reward">🎁 {rewardLabel}</span>}
        {deadline && !completed && (
          <span className="quest-deadline">⏰ {formatDeadline(deadline)}</span>
        )}
        {!completed && (
          <span className="quest-count">{quest.progress}/{quest.target_count}</span>
        )}
      </div>
    </div>
  );
}

export default function QuestList({ quests }) {
  if (!quests || quests.length === 0) {
    return <p className="passport-empty">No quests yet. Keep exploring to unlock quests!</p>;
  }

  const active    = quests.filter(q => !q.completed_at);
  const completed = quests.filter(q => Boolean(q.completed_at));

  return (
    <div className="quest-list-wrapper">
      {active.length > 0 && (
        <section className="quest-section">
          <h3 className="quest-section-title">Active Quests</h3>
          {active.map(q => <QuestItem key={q.id} quest={q} />)}
        </section>
      )}
      {completed.length > 0 && (
        <section className="quest-section quest-section--completed">
          <h3 className="quest-section-title">Completed</h3>
          {completed.map(q => <QuestItem key={q.id} quest={q} />)}
        </section>
      )}
    </div>
  );
}
