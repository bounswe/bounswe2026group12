import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CulturalStoryForm from '../components/CulturalStoryForm';
import { trimCulturalStoryForPayload } from '../components/culturalStoryFields';

function Harness({ initial = {}, onCommit }) {
  const [values, setValues] = useState(initial);
  return (
    <CulturalStoryForm
      values={values}
      onChange={(key, value) => {
        setValues((prev) => {
          const next = { ...prev, [key]: value };
          onCommit?.(next);
          return next;
        });
      }}
    />
  );
}

describe('CulturalStoryForm', () => {
  it('starts collapsed when no field has content', () => {
    render(<Harness initial={{}} />);
    // Toggle button visible
    expect(
      screen.getByRole('button', { name: /tell your story/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    // Textareas hidden until expanded
    expect(screen.queryByPlaceholderText(/this dish is how i know/i)).toBeNull();
  });

  it('starts expanded when any field is pre-filled (edit case)', () => {
    render(<Harness initial={{ identity_note: 'Already filled' }} />);
    expect(
      screen.getByRole('button', { name: /tell your story/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByDisplayValue('Already filled')).toBeInTheDocument();
  });

  it('toggles open and closed when the header is clicked', () => {
    render(<Harness initial={{}} />);
    const toggle = screen.getByRole('button', { name: /tell your story/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('writes through onChange (parent owns the state)', () => {
    const commits = [];
    render(<Harness onCommit={(v) => commits.push(v)} />);
    fireEvent.click(screen.getByRole('button', { name: /tell your story/i }));
    const input = screen.getByPlaceholderText(/this dish is how i know/i);
    fireEvent.change(input, { target: { value: 'Mine' } });
    expect(commits[commits.length - 1]).toEqual(
      expect.objectContaining({ identity_note: 'Mine' }),
    );
  });
});

describe('trimCulturalStoryForPayload', () => {
  it('drops blank and whitespace-only fields and trims surviving ones', () => {
    expect(
      trimCulturalStoryForPayload({
        identity_note: '  Heritage matters.  ',
        memory_note: '',
        ritual_note: '   ',
        craft_note: 'Knead with hands.',
        bogus_extra: 'ignored',
      }),
    ).toEqual({
      identity_note: 'Heritage matters.',
      craft_note: 'Knead with hands.',
    });
  });

  it('returns an empty object when nothing is filled', () => {
    expect(trimCulturalStoryForPayload({})).toEqual({});
    expect(trimCulturalStoryForPayload(null)).toEqual({});
    expect(trimCulturalStoryForPayload(undefined)).toEqual({});
  });
});
