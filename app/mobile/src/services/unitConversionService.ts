import { apiPostJson } from './httpClient';

export type ConvertedAmount = { amount: string; unit: string };

type RawResponse = {
  amount: string;
  from_unit: string;
  to_unit: string;
  ingredient_id: number | null;
};

/**
 * Module-level cache keyed by `amount|fromUnit|toUnit|ingredientId`. Survives
 * the lifetime of the JS engine so toggling the unit panel back and forth
 * doesn't re-hit the API.
 */
const cache = new Map<string, ConvertedAmount>();

function cacheKey(
  amount: string | number,
  fromUnit: string,
  toUnit: string,
  ingredientId: number | undefined,
): string {
  return `${String(amount)}|${fromUnit}|${toUnit}|${ingredientId ?? ''}`;
}

export async function fetchConversion(
  amount: string | number,
  fromUnit: string,
  toUnit: string,
  ingredientId?: number,
): Promise<ConvertedAmount> {
  const key = cacheKey(amount, fromUnit, toUnit, ingredientId);
  const cached = cache.get(key);
  if (cached) return cached;

  const body: Record<string, unknown> = {
    amount: String(amount),
    from_unit: fromUnit,
    to_unit: toUnit,
  };
  if (ingredientId !== undefined && ingredientId !== null) {
    body.ingredient_id = ingredientId;
  }

  const res = await apiPostJson<RawResponse>('/api/convert/', body);
  const result: ConvertedAmount = { amount: res.amount, unit: res.to_unit };
  cache.set(key, result);
  return result;
}
