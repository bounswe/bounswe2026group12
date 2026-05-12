import './StepsEditor.css';

/**
 * Controlled editor for an ordered list of recipe steps (#805).
 *
 * Steps are plain strings; the editor renders one textarea per step plus
 * up / down / remove buttons and an "Add step" button at the bottom. Parent
 * owns the array and re-renders us via `value`; we surface every mutation
 * through `onChange(nextArray)`.
 */
export default function StepsEditor({ value, onChange }) {
  const steps = Array.isArray(value) ? value : [];

  function update(index, nextValue) {
    const next = steps.slice();
    next[index] = nextValue;
    onChange(next);
  }

  function remove(index) {
    const next = steps.slice();
    next.splice(index, 1);
    onChange(next);
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = steps.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    onChange([...steps, '']);
  }

  return (
    <div className="steps-editor">
      <ol className="steps-editor-list">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const inputId = `step-${stepNumber}`;
          return (
            <li key={index} className="steps-editor-row">
              <label htmlFor={inputId} className="steps-editor-label">
                Step {stepNumber}
              </label>
              <textarea
                id={inputId}
                className="steps-editor-input"
                value={step}
                rows={3}
                onChange={(e) => update(index, e.target.value)}
                placeholder={`Describe step ${stepNumber}…`}
              />
              <div className="steps-editor-controls">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move step ${stepNumber} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === steps.length - 1}
                  aria-label={`Move step ${stepNumber} down`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove step ${stepNumber}`}
                  className="steps-editor-remove"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="btn btn-outline btn-sm steps-editor-add"
        onClick={add}
      >
        + Add Step
      </button>
    </div>
  );
}
