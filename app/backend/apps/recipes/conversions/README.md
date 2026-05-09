# Conversion subsystem

Bundles three M5 deliverables: pure conversion engine (#374), per-ingredient density table (#375), and the `/api/convert/` HTTP endpoint (#376).

## Engine

`apps.recipes.conversions.convert(amount, from_unit, to_unit, *, density_g_per_ml=None) -> Decimal`

Pure function, no Django, no DB. Decimal-based. Raises `ConversionError` for any failure (unknown unit, invalid amount, missing density on a mass <-> volume request).

Coverage:

- Mass: `mg`, `g`, `kg`, `oz`, `lb` (singular/plural and common spellings accepted via the alias table).
- Volume metric: `ml`, `l`.
- Volume imperial / US customary: `tsp`, `tbsp`, `fl_oz`, `cup`, `pint`, `quart`, `gallon`.
- Informal volume: `pinch` (1/16 tsp), `dash` (1/8 tsp), `smidgen` (1/32 tsp).

The cup is the 240 ml US legal cup. See `engine.py` for the constants and rationale.

## Density table

`Ingredient.density_g_per_ml` is a nullable `DecimalField(8, 4)`. Required for any mass <-> volume request. Cited density values live in `references.md`. The seeder is at `apps/recipes/management/commands/seed_ingredient_densities.py` and is idempotent.

```bash
python manage.py seed_ingredient_densities
```

To add an ingredient:

1. Cite the density in `references.md` with a real source.
2. Add the row to `SEED_DENSITIES` in the management command.
3. Re-run the seeder.

## Endpoint contract

`POST /api/convert/` — public (`AllowAny`).

Request body (JSON):

```json
{
  "amount": "1.5",
  "from_unit": "cup",
  "to_unit": "g",
  "ingredient_id": 42
}
```

- `amount`: required. String or number; serialized through DRF `DecimalField`.
- `from_unit`, `to_unit`: required. Strings. Aliases tolerated (`grams`, `g`, `tablespoons`, `tbsp`, etc.). Case-insensitive.
- `ingredient_id`: optional. Required when crossing dimensions (mass <-> volume) so the engine can read its `density_g_per_ml`.

Success (200):

```json
{
  "amount": "180.0",
  "from_unit": "cup",
  "to_unit": "g",
  "ingredient_id": 42
}
```

Failure (400):

- Missing density: `{ "detail": "Mass to volume conversion requires density_g_per_ml; ..." }`
- Unknown unit: `{ "detail": "Unknown unit: 'foobar'." }`
- Bad amount or missing fields: standard DRF validation error shape.
- Ingredient not found: `{ "detail": "Ingredient 999 not found." }`

## OpenAPI

The project does not currently wire up drf-spectacular or any other OpenAPI generator (see `requirements.txt`). The endpoint contract is documented here in lieu of a generated schema. Switching to drf-spectacular is a reasonable follow-up.
