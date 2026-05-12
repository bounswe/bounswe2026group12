import { render } from '@testing-library/react';
import PassportMap from '../components/passport/PassportMap';

describe('PassportMap', () => {
  it('renders without crashing when cultures is null', () => {
    expect(() => render(<PassportMap cultures={null} />)).not.toThrow();
  });

  it('renders without crashing when cultures is undefined', () => {
    expect(() => render(<PassportMap cultures={undefined} />)).not.toThrow();
  });

  it('renders without crashing when cultures is empty', () => {
    expect(() => render(<PassportMap cultures={[]} />)).not.toThrow();
  });

  it('renders without crashing on the canonical backend culture shape (no `name`)', () => {
    // Regression: PassportMap used to read `c.name` directly and crashed when
    // the backend shipped `culture_summaries[]` with `culture` instead.
    const backendShape = [
      { culture: 'Black Sea', recipes_tried: 1, stories_saved: 0, interactions: 1, rarity: 'bronze' },
      { culture: 'Aegean',    recipes_tried: 0, stories_saved: 2, interactions: 2, rarity: 'silver' },
    ];
    expect(() => render(<PassportMap cultures={backendShape} />)).not.toThrow();
  });

  it('drops cultures with no usable name without throwing', () => {
    const bad = [
      { culture: null, recipes_tried: 1, stories_saved: 0, rarity: 'bronze' },
      { recipes_tried: 1, stories_saved: 0, rarity: 'bronze' }, // no `culture` key at all
    ];
    expect(() => render(<PassportMap cultures={bad} />)).not.toThrow();
  });
});
