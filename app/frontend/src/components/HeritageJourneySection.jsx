import './HeritageJourneySection.css';

export default function HeritageJourneySection({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  return (
    <section className="heritage-journey">
      <h2 className="heritage-journey-heading">Journey</h2>
      <ol className="heritage-journey-list">
        {sorted.map((step, index) => (
          <li key={step.id} className="heritage-journey-step">
            <div className="heritage-journey-marker" aria-hidden="true">{index + 1}</div>
            <div className="heritage-journey-card">
              <div className="heritage-journey-card-head">
                <span className="heritage-journey-location" data-testid="journey-step-location">
                  {step.location}
                </span>
                {step.era && (
                  <span className="heritage-journey-era" data-testid="journey-step-era">
                    {step.era}
                  </span>
                )}
              </div>
              <p className="heritage-journey-story">{step.story}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
