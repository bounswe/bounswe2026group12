import { apiGetJson } from './httpClient';
import { MOCK_DAILY_CULTURAL, type DailyCulturalCard } from '../mocks/dailyCultural';

/**
 * Backend `#348` — `GET /api/cultural-content/daily/` is not implemented yet.
 * Falls back to mock data so the UI is testable now. Swap is one-line when API ships.
 */
export async function fetchDailyCultural(): Promise<DailyCulturalCard[]> {
  try {
    const data = await apiGetJson<DailyCulturalCard[]>('/api/cultural-content/daily/');
    if (Array.isArray(data) && data.length > 0) return data;
    return MOCK_DAILY_CULTURAL;
  } catch {
    return MOCK_DAILY_CULTURAL;
  }
}
