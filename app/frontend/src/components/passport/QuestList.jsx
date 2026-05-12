import './QuestList.css';

function formatDeadline(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function QuestItem({ quest }) {
  const pct = quest.max_progress > 0 ? Math.min(100, (quest.progress / quest.max_progress) * 100) : 0;

  return (
    <div className={`quest-item${quest.completed ? ' quest-item--done' : ''}`}>
      <div className="quest-header">
        <span className="quest-name">{quest.name}</span>
        {quest.completed && <span className="quest-done-badge">✓ Done</span>}
      </div>
      <p className="quest-description">{quest.description}</p>
      {!quest.completed && (
        <div className="quest-progress-bar" role="progressbar" aria-valuenow={quest.progress} aria-valuemax={quest.max_progress}>
          <div className="quest-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="quest-meta">
        <span className="quest-reward">🎁 {quest.reward}</span>
        {quest.deadline && !quest.completed && (
          <span className="quest-deadline">⏰ {formatDeadline(quest.deadline)}</span>
        )}
        {!quest.completed && (
          <span className="quest-count">{quest.progress}/{quest.max_progress}</span>
        )}
      </div>
    </div>
  );
}

export default function QuestList({ quests }) {
  if (!quests || quests.length === 0) {
    return <p className="passport-empty">No quests yet. Keep exploring to unlock quests!</p>;
  }

  const active    = quests.filter(q => !q.completed);
  const completed = quests.filter(q => q.completed);

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
