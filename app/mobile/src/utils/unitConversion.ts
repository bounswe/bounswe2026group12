type ConversionPair = { to: string; factor: number };

const CONVERSIONS: Record<string, ConversionPair> = {
  grams: { to: 'oz', factor: 0.035274 },
  kg: { to: 'lb', factor: 2.20462 },
  ml: { to: 'fl oz', factor: 0.033814 },
  liters: { to: 'qt', factor: 1.05669 },
  cups: { to: 'ml', factor: 236.588 },
  tablespoons: { to: 'ml', factor: 14.787 },
  teaspoons: { to: 'ml', factor: 4.929 },
};

export type ConvertedAmount = { amount: string; unit: string };

export function convertIngredient(
  amount: string | number,
  unitName: string,
): ConvertedAmount | null {
  const pair = CONVERSIONS[unitName];
  if (!pair) return null;
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount);
  if (Number.isNaN(numeric)) return null;
  const converted = numeric * pair.factor;
  return { amount: formatAmount(converted), unit: pair.to };
}

function formatAmount(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}
