"""Pure unit conversion engine.

No Django imports, no DB. Operates on Decimal to avoid float drift.

All ratios resolve to a base unit per dimension:
- Mass:   grams (g)
- Volume: millilitres (ml)

Mass <-> volume crossing requires a density value in g/ml.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Mapping


class ConversionError(ValueError):
    """Raised for any unconvertible request: unknown unit, missing density, etc."""


# Aliases normalize user input. Values are the canonical keys used in the ratio
# tables below. Lower-cased, whitespace-stripped, dot-stripped.
_ALIASES: Mapping[str, str] = {
    # mass: metric
    'mg': 'mg', 'milligram': 'mg', 'milligrams': 'mg',
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    # mass: imperial
    'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
    'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
    # volume: metric
    'ml': 'ml', 'millilitre': 'ml', 'millilitres': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
    'l': 'l', 'litre': 'l', 'litres': 'l', 'liter': 'l', 'liters': 'l',
    # volume: imperial / US customary
    'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'fl_oz': 'fl_oz', 'floz': 'fl_oz', 'fl oz': 'fl_oz', 'fluid ounce': 'fl_oz', 'fluid ounces': 'fl_oz',
    'cup': 'cup', 'cups': 'cup',
    'pint': 'pint', 'pints': 'pint', 'pt': 'pint',
    'quart': 'quart', 'quarts': 'quart', 'qt': 'quart',
    'gallon': 'gallon', 'gallons': 'gallon', 'gal': 'gallon',
    # informal volume
    'pinch': 'pinch', 'pinches': 'pinch',
    'dash': 'dash', 'dashes': 'dash',
    'smidgen': 'smidgen', 'smidgens': 'smidgen',
}


# Mass to grams.
# Imperial: 1 oz = 28.349523125 g (international avoirdupois, NIST).
_MASS_TO_G: Mapping[str, Decimal] = {
    'mg': Decimal('0.001'),
    'g': Decimal('1'),
    'kg': Decimal('1000'),
    'oz': Decimal('28.349523125'),
    'lb': Decimal('453.59237'),
}


# Volume to millilitres.
# US customary: 1 cup = 240 ml (legal/nutrition labelling), 1 tbsp = 15 ml,
# 1 tsp = 5 ml. fl_oz, pint, quart, gallon use the US legal cup of 240 ml as
# the basis (8 fl_oz = 1 cup => 1 fl_oz = 30 ml; 2 cups = 1 pint, 4 cups =
# 1 quart, 16 cups = 1 gallon). This matches FDA labelling rather than the
# slightly-smaller US customary cup (236.588 ml). Picked deliberately because
# recipe contexts almost always assume the labelling cup.
#
# Informal:
#   pinch = 1/16 tsp
#   dash  = 1/8  tsp
#   smidgen = 1/32 tsp
# These are the widely-accepted measuring-spoon-set ratios.
_VOLUME_TO_ML: Mapping[str, Decimal] = {
    'ml': Decimal('1'),
    'l': Decimal('1000'),
    'tsp': Decimal('5'),
    'tbsp': Decimal('15'),
    'fl_oz': Decimal('30'),
    'cup': Decimal('240'),
    'pint': Decimal('480'),
    'quart': Decimal('960'),
    'gallon': Decimal('3840'),
    'pinch': Decimal('5') / Decimal('16'),
    'dash': Decimal('5') / Decimal('8'),
    'smidgen': Decimal('5') / Decimal('32'),
}


def _normalize(unit: str) -> str:
    if not isinstance(unit, str):
        raise ConversionError(f'Unit must be a string, got {type(unit).__name__}.')
    key = unit.strip().lower().replace('.', '')
    canonical = _ALIASES.get(key)
    if canonical is None:
        raise ConversionError(f'Unknown unit: {unit!r}.')
    return canonical


def _dimension(canonical: str) -> str:
    if canonical in _MASS_TO_G:
        return 'mass'
    if canonical in _VOLUME_TO_ML:
        return 'volume'
    raise ConversionError(f'Unknown unit: {canonical!r}.')


def convert(
    amount,
    from_unit: str,
    to_unit: str,
    *,
    density_g_per_ml: Decimal | None = None,
) -> Decimal:
    """Convert ``amount`` from ``from_unit`` to ``to_unit``.

    Mass <-> volume conversion requires ``density_g_per_ml``.
    Returns a Decimal. Raises ConversionError on any failure.
    """
    try:
        amount_d = Decimal(str(amount))
    except Exception as exc:
        raise ConversionError(f'Invalid amount: {amount!r}.') from exc

    if amount_d < 0:
        raise ConversionError('Amount must be non-negative.')

    src = _normalize(from_unit)
    dst = _normalize(to_unit)

    src_dim = _dimension(src)
    dst_dim = _dimension(dst)

    if src_dim == dst_dim:
        return _convert_same_dim(amount_d, src, dst, src_dim)

    if density_g_per_ml is None:
        raise ConversionError(
            'Mass to volume conversion requires density_g_per_ml; '
            f'cannot convert {from_unit!r} to {to_unit!r} without it.'
        )
    try:
        density = Decimal(str(density_g_per_ml))
    except Exception as exc:
        raise ConversionError(f'Invalid density: {density_g_per_ml!r}.') from exc
    if density <= 0:
        raise ConversionError('density_g_per_ml must be positive.')

    if src_dim == 'volume' and dst_dim == 'mass':
        ml = amount_d * _VOLUME_TO_ML[src]
        grams = ml * density
        return grams / _MASS_TO_G[dst]

    # mass -> volume
    grams = amount_d * _MASS_TO_G[src]
    ml = grams / density
    return ml / _VOLUME_TO_ML[dst]


def _convert_same_dim(amount: Decimal, src: str, dst: str, dim: str) -> Decimal:
    table = _MASS_TO_G if dim == 'mass' else _VOLUME_TO_ML
    base = amount * table[src]
    return base / table[dst]
