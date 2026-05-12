import { useState } from 'react';
import { CULTURAL_STORY_FIELDS } from './culturalStoryFields';
import './CulturalStoryForm.css';

/**
 * Optional "Tell Your Story" section for the recipe create/edit form (#516).
 * Renders a collapsible panel containing the seven narrative textareas from
 * `CULTURAL_STORY_FIELDS`. All fields are optional and free-form. The parent
 * owns the `values` object and the `onChange(key, value)` handler so the
 * payload is built once at submit time (`trimCulturalStoryForPayload`).
 *
 * Initial expansion: open by default if any field already has content
 * (typical on the edit page when the recipe already carries a cultural
 * context), collapsed otherwise (typical on first-time create).
 */
export default function CulturalStoryForm({ values, onChange }) {
  const [open, setOpen] = useState(() =>
    CULTURAL_STORY_FIELDS.some((f) => {
      const v = values?.[f.key];
      return typeof v === 'string' && v.trim().length > 0;
    }),
  );

  return (
    <fieldset className={`cultural-story-form${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="cultural-story-form-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="cultural-story-form-toggle-label">
          Tell Your Story — Beyond the Recipe (optional)
        </span>
        <span className="cultural-story-form-toggle-chev" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="cultural-story-form-body">
          <p className="cultural-story-form-intro">
            Any of these you'd like to share — leave the rest blank.
          </p>
          {CULTURAL_STORY_FIELDS.map((field) => (
            <label key={field.key} className="cultural-story-form-field">
              <span className="cultural-story-form-field-label">{field.label}</span>
              <span className="cultural-story-form-field-hint">{field.hint}</span>
              <textarea
                className="cultural-story-form-field-input"
                value={values?.[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
              />
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
