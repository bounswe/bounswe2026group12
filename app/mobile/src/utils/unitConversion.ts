/**
 * Mapping from a source unit name to the target unit the recipe-detail
 * "Converted" toggle displays. The actual math goes through the backend
 * `/api/convert/` API (`services/unitConversionService.ts`).
 */
const TARGET_UNITS: Record<string, string> = {
  grams: 'oz',
  kg: 'lb',
  ml: 'fl oz',
  liters: 'qt',
  cups: 'ml',
  tablespoons: 'ml',
  teaspoons: 'ml',
};

export type ConvertedAmount = { amount: string; unit: string };

export function targetUnitFor(unitName: string): string | null {
  return TARGET_UNITS[unitName] ?? null;
}
