/**
 * Same role as web `REACT_APP_API_URL` in `app/frontend/src/services/api.js`.
 * Set `EXPO_PUBLIC_API_URL` in `.env` for a real device hitting your machine (e.g. LAN IP).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
