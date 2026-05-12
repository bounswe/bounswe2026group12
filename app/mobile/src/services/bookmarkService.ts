import type { RecipeDetail } from '../types/recipe';
import { apiGetJson, apiPostJson, nextPagePath } from './httpClient';

/**
 * Backend `POST /api/recipes/:id/bookmark/` is a toggle (no body). Returns the
 * fresh `is_bookmarked` flag plus the updated `bookmark_count` so the UI can
 * sync to canonical server state instead of guessing locally.
 */
export type ToggleBookmarkResult = {
  is_bookmarked: boolean;
  bookmark_count: number;
};

type RawToggle = {
  is_bookmarked?: unknown;
  bookmark_count?: unknown;
};

/** Defensive coerce — backend always sends these, but a stale build or proxy
 * sometimes drops them, and we'd rather show a stable UI than crash. */
function normalizeToggle(raw: RawToggle | null | undefined): ToggleBookmarkResult {
  const flag = typeof raw?.is_bookmarked === 'boolean' ? raw.is_bookmarked : false;
  const countRaw = raw?.bookmark_count;
  const count =
    typeof countRaw === 'number' && Number.isFinite(countRaw)
      ? countRaw
      : typeof countRaw === 'string' && countRaw !== ''
        ? Number(countRaw)
        : 0;
  return {
    is_bookmarked: flag,
    bookmark_count: Number.isFinite(count) ? count : 0,
  };
}

export async function toggleBookmark(recipeId: number | string): Promise<ToggleBookmarkResult> {
  const data = await apiPostJson<RawToggle>(`/api/recipes/${recipeId}/bookmark/`, {});
  return normalizeToggle(data);
}

type Paginated<T> = { count?: number; next?: string | null; results?: T[] };

type RawRecipeListItem = {
  id: number | string;
  title?: string;
  region?: unknown;
  region_name?: string | null;
  author?: unknown;
  author_username?: string | null;
  image?: string | null;
  is_bookmarked?: boolean;
  bookmark_count?: number;
};

/** Subset of RecipeDetail surfaced by the list endpoint — enough for cards. */
export type BookmarkedRecipeListItem = {
  id: string;
  title: string;
  region?: string;
  author?: RecipeDetail['author'];
  author_username?: string;
  image?: string | null;
  is_bookmarked: boolean;
  bookmark_count?: number;
};

function normalizeListItem(raw: RawRecipeListItem): BookmarkedRecipeListItem {
  const reg = raw.region;
  const regionLabel =
    typeof reg === 'string'
      ? reg
      : reg && typeof reg === 'object' && 'name' in reg && typeof (reg as { name: unknown }).name === 'string'
        ? (reg as { name: string }).name
        : typeof raw.region_name === 'string'
          ? raw.region_name
          : undefined;
  return {
    id: String(raw.id),
    title: String(raw.title ?? ''),
    region: regionLabel,
    author:
      typeof raw.author === 'number'
        ? raw.author
        : typeof raw.author === 'object' && raw.author !== null
          ? (raw.author as RecipeDetail['author'])
          : undefined,
    author_username:
      typeof raw.author_username === 'string' ? raw.author_username : undefined,
    image: typeof raw.image === 'string' ? raw.image : null,
    // Items returned by `?bookmarked=true` are by definition saved.
    is_bookmarked: typeof raw.is_bookmarked === 'boolean' ? raw.is_bookmarked : true,
    bookmark_count: typeof raw.bookmark_count === 'number' ? raw.bookmark_count : undefined,
  };
}

/**
 * Walk DRF pagination on `GET /api/recipes/?bookmarked=true`. Mirrors the
 * pattern in `ingredientRouteService` / `mapDataService` so a profile with many
 * saves doesn't silently truncate at the first page.
 */
export async function fetchBookmarkedRecipes(): Promise<BookmarkedRecipeListItem[]> {
  const collected: BookmarkedRecipeListItem[] = [];
  let path: string | null = '/api/recipes/?bookmarked=true';
  while (path) {
    const data: Paginated<RawRecipeListItem> | RawRecipeListItem[] = await apiGetJson<
      Paginated<RawRecipeListItem> | RawRecipeListItem[]
    >(path);
    if (Array.isArray(data)) {
      for (const r of data) collected.push(normalizeListItem(r));
      break;
    }
    const results = Array.isArray(data.results) ? data.results : [];
    for (const r of results) collected.push(normalizeListItem(r));
    path = nextPagePath(data.next);
  }
  return collected;
}
