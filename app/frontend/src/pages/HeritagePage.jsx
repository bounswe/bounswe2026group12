import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchHeritageGroup } from '../services/heritageService';
import { fetchCulturalFacts } from '../services/culturalFactService';
import HeritageJourneySection from '../components/HeritageJourneySection';
import CulturalFactCard from '../components/CulturalFactCard';
import './HeritagePage.css';

export default function HeritagePage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchHeritageGroup(id)
      .then((data) => { if (!cancelled) setGroup(data); })
      .catch(() => { if (!cancelled) setError('Could not load heritage group.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchCulturalFacts({ heritageGroup: id })
      .then((data) => { if (!cancelled) setFacts(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!group) return null;

  return (
    <main className="page-card heritage-page">
      <header className="heritage-page-header">
        <span className="heritage-page-eyebrow">🏛 Heritage Group</span>
        <h1 className="heritage-page-title">{group.name}</h1>
        {group.description && (
          <p className="heritage-page-description">{group.description}</p>
        )}
        <Link to={`/heritage/${group.id}/map`} className="btn btn-primary heritage-page-map-cta">
          Show Heritage Map
        </Link>
      </header>

      {facts.length > 0 && (
        <section className="heritage-facts">
          <h2 className="heritage-section-heading">Did You Know?</h2>
          <div className="heritage-facts-grid">
            {facts.map((fact) => (
              <CulturalFactCard key={fact.id} fact={fact} />
            ))}
          </div>
        </section>
      )}

      <HeritageJourneySection steps={group.journey_steps} />

      <section className="heritage-members">
        <h2 className="heritage-section-heading">Recipes & Stories</h2>
        {!group.members || group.members.length === 0 ? (
          <p className="heritage-empty">This group has no linked recipes or stories yet.</p>
        ) : (
          <ul className="heritage-members-grid">
            {group.members.map((member) => (
              <li key={`${member.content_type}-${member.id}`} className="heritage-member-card">
                <Link
                  to={`/${member.content_type === 'recipe' ? 'recipes' : 'stories'}/${member.id}`}
                  className="heritage-member-link"
                >
                  <span className={`heritage-member-type heritage-member-type-${member.content_type}`}>
                    {member.content_type === 'recipe' ? '🍲 Recipe' : '📖 Story'}
                  </span>
                  <span className="heritage-member-title">{member.title}</span>
                  <span className="heritage-member-meta">
                    {member.author && <span>@{member.author}</span>}
                    {member.region && <span>{member.region}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
