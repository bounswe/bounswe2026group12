import { apiGetJson, apiPatchJson } from './httpClient';

/**
 * Shape mirroring the backend `UserProfileSerializer` (`/api/users/me/`).
 *
 * The serializer source of truth lives in
 * `app/backend/apps/users/serializers.py::UserProfileSerializer` and
 * `UserPreferencesUpdateSerializer` — only the fields below are writable via
 * PATCH; `id`, `email`, `username`, `role`, `created_at` are read-only.
 *
 * Note: there is currently no `avatar` or `display_name` field on the User
 * model, so the mobile edit screen omits those affordances. Add them here
 * (and to the edit screen) once the backend exposes them.
 */
export type UserProfile = {
  id: number | string;
  username: string;
  email: string;
  bio?: string | null;
  region?: string | null;
  preferred_language?: string | null;
  is_contactable?: boolean;
  cultural_interests?: string[];
  regional_ties?: string[];
  religious_preferences?: string[];
  event_interests?: string[];
};

/** Fields the backend accepts on `PATCH /api/users/me/`. */
export type UpdateProfilePayload = Partial<
  Pick<
    UserProfile,
    | 'bio'
    | 'region'
    | 'preferred_language'
    | 'is_contactable'
    | 'cultural_interests'
    | 'regional_ties'
    | 'religious_preferences'
    | 'event_interests'
  >
>;

const ENDPOINT = '/api/users/me/';

/** Fetch the current authenticated user's profile. */
export async function fetchOwnProfile(): Promise<UserProfile> {
  return apiGetJson<UserProfile>(ENDPOINT);
}

/** Partial update of the current user's profile. */
export async function updateOwnProfile(
  patch: UpdateProfilePayload,
): Promise<UserProfile> {
  return apiPatchJson<UserProfile>(ENDPOINT, patch);
}

/**
 * Public-facing user profile shape returned by `GET /api/users/<username>/`.
 *
 * Backed by `PublicUserSerializer` in
 * `app/backend/apps/users/serializers.py`. Note this endpoint lives at
 * `/api/users/<username>/` (no `/profile/` suffix). The "dietary preferences"
 * surfaced on web is actually the `religious_preferences` field on the
 * backend — there is no separate `dietary_preferences` field today.
 */
export type PublicUserProfile = {
  username: string;
  bio?: string | null;
  region?: string | null;
  cultural_interests?: string[];
  religious_preferences?: string[];
  event_interests?: string[];
  created_at?: string | null;
  recipe_count?: number;
  story_count?: number;
};

/** Fetch a user's public profile by username. */
export async function fetchPublicProfile(
  username: string,
): Promise<PublicUserProfile> {
  return apiGetJson<PublicUserProfile>(
    `/api/users/${encodeURIComponent(username)}/`,
  );
}
