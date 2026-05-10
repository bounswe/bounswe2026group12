import { apiGetJson, nextPagePath } from './httpClient';

export type Tag = { id: number; name: string; is_approved?: boolean };

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

async function fetchAll(path: string): Promise<Tag[]> {
  const collected: Tag[] = [];
  let cursor: string | null = path;
  while (cursor) {
    const data: Paginated<Tag> | Tag[] = await apiGetJson<Paginated<Tag> | Tag[]>(cursor);
    if (Array.isArray(data)) {
      collected.push(...data);
      break;
    }
    collected.push(...data.results);
    cursor = nextPagePath(data.next);
  }
  // Server already filters list/retrieve by is_approved=True; the lookup
  // serializer doesn't expose the flag at all. No client-side filtering needed.
  return collected;
}

export async function fetchDietaryTags(): Promise<Tag[]> {
  return fetchAll('/api/dietary-tags/');
}

export async function fetchEventTags(): Promise<Tag[]> {
  return fetchAll('/api/event-tags/');
}
