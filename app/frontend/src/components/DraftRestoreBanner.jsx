import './DraftRestoreBanner.css';

export default function DraftRestoreBanner({ draft, onRestore, onDiscard }) {
  if (!draft) return null;
  return (
    <div className="draft-banner" role="alert">
      <span>Unsaved draft found</span>
      <div className="draft-banner-actions">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => onRestore(draft)}
        >
          Restore
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={onDiscard}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
