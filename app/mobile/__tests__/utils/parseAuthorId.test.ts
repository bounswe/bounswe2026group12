import { parseAuthorId } from '../../src/utils/parseAuthorId';

describe('parseAuthorId', () => {
  it('returns null for null, undefined, and empty string', () => {
    expect(parseAuthorId(null)).toBeNull();
    expect(parseAuthorId(undefined)).toBeNull();
    expect(parseAuthorId('')).toBeNull();
  });

  it('returns the number as-is when given a finite number', () => {
    expect(parseAuthorId(42)).toBe(42);
    expect(parseAuthorId(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(parseAuthorId('17')).toBe(17);
  });

  it('returns null for non-numeric strings', () => {
    expect(parseAuthorId('abc')).toBeNull();
  });

  it('unwraps a nested object with an id field', () => {
    expect(parseAuthorId({ id: 7, username: 'foo' })).toBe(7);
    expect(parseAuthorId({ id: '9' })).toBe(9);
  });

  it('returns null for an object without a usable id', () => {
    expect(parseAuthorId({ id: 'not-a-number' })).toBeNull();
    expect(parseAuthorId({ username: 'foo' })).toBeNull();
  });
});
