/**
 * DRF often serializes ForeignKey `author` as the related primary key (number).
 * Some payloads use a nested `{ id, username }` object instead.
 */
export function parseAuthorId(author: unknown): number | null {
  if (author == null || author === '') return null;
  if (typeof author === 'number' && !Number.isNaN(author)) return author;
  if (typeof author === 'string') {
    const n = Number(author);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof author === 'object' && author !== null && 'id' in author) {
    const n = Number((author as { id: unknown }).id);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
