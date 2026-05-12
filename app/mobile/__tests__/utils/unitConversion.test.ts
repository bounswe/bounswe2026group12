import { targetUnitFor } from '../../src/utils/unitConversion';

describe('targetUnitFor', () => {
  it('maps metric units to imperial / cooking targets', () => {
    expect(targetUnitFor('grams')).toBe('oz');
    expect(targetUnitFor('kg')).toBe('lb');
    expect(targetUnitFor('ml')).toBe('fl oz');
    expect(targetUnitFor('liters')).toBe('qt');
  });

  it('maps volumetric cooking units to millilitres', () => {
    expect(targetUnitFor('cups')).toBe('ml');
    expect(targetUnitFor('tablespoons')).toBe('ml');
    expect(targetUnitFor('teaspoons')).toBe('ml');
  });

  it('returns null for unknown units', () => {
    expect(targetUnitFor('handfuls')).toBeNull();
    expect(targetUnitFor('')).toBeNull();
  });
});
