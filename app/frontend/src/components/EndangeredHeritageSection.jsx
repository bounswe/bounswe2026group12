import HeritageStatusBadge from './HeritageStatusBadge';
import './EndangeredHeritageSection.css';

const BLURB = {
  endangered: 'This recipe is at risk of being lost. Cooks, source it, share it, keep it on the table.',
  preserved:  'A heritage recipe actively kept alive by its community.',
  revived:    'Once nearly lost — now coming back through deliberate revival.',
};

/**
 * Status info box + sourced notes for the recipe detail page (#520 web,
 * mirrors mobile #720). Renders nothing when the recipe has neither a
 * meaningful heritage status nor any endangered notes.
 */
export default function EndangeredHeritageSection({ status, notes }) {
  const hasStatus = status && status !== 'none' && BLURB[status];
  const safeNotes = Array.isArray(notes) ? notes.filter(Boolean) : [];
  const hasNotes = safeNotes.length > 0;
  if (!hasStatus && !hasNotes) return null;

  return (
    <section className="endangered-heritage" aria-label="Endangered heritage status">
      {hasStatus && (
        <div className={`endangered-heritage-card endangered-heritage-${status}`}>
          <HeritageStatusBadge status={status} size="md" />
          <p className="endangered-heritage-blurb">{BLURB[status]}</p>
        </div>
      )}
      {hasNotes && (
        <div className="endangered-heritage-notes">
          <h3 className="endangered-heritage-notes-heading">Sourced notes</h3>
          <ul className="endangered-heritage-note-list">
            {safeNotes.map((note) => (
              <li key={note.id} className="endangered-heritage-note">
                <p className="endangered-heritage-note-text">{note.text}</p>
                {note.source_url && (
                  <a
                    href={note.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="endangered-heritage-note-source"
                  >
                    Source ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
