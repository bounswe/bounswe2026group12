# Ingredient density references

Every ingredient density seeded by `seed_ingredient_densities` lives in this file with a citation. No uncited values land in the seeder. If you add an ingredient, add its row here first.

Densities are stored as grams per millilitre (g/ml). For solids that come in different forms (e.g. granulated vs. powdered sugar), pick the most common cooking form and note the choice.

## Sources

1. **USDA FoodData Central** (`https://fdc.nal.usda.gov/`). Treat the "Standard Reference Legacy" portions as primary. Where USDA reports per-100g and per-cup nutrition, the implied grams-per-cup ratio yields g/ml at 240 ml per cup.
2. **King Arthur Baking ingredient weight chart** (`https://www.kingarthurbaking.com/learn/ingredient-weight-chart`). Reliable for baking staples (flour, sugar variants).
3. **CRC Handbook of Chemistry and Physics**, 100th ed. (Rumble, J.R., editor). For pure-substance densities (water, ethanol).
4. **TürKomp Turkish Food Composition Database** (`http://www.turkomp.gov.tr/`). Used when USDA does not cover a regionally-relevant ingredient.

## Per-ingredient table

| Ingredient   | Density (g/ml) | Source / note |
|--------------|----------------|---------------|
| Water        | 1.0000         | CRC Handbook (4 deg C ref); standard culinary approximation. |
| Olive Oil    | 0.9150         | USDA FDC ID 171413 (oil, olive, salad or cooking): 216 g per 240 ml cup. |
| Honey        | 1.4200         | USDA FDC ID 169640: 339 g per 240 ml cup, rounded. |
| Sugar        | 0.8500         | King Arthur weight chart: granulated cane sugar 200 g per 240 ml cup. |
| Flour        | 0.5300         | King Arthur weight chart: all-purpose flour 120 g per 240 ml cup (sifted). |
| Rice         | 0.7900         | USDA FDC ID 169757 (rice, white, long-grain, raw): 190 g per 240 ml cup. |
| Lentils      | 0.8000         | USDA FDC ID 172420 (lentils, raw): 192 g per 240 ml cup. |
| Salt         | 1.2000         | King Arthur weight chart: table salt 288 g per 240 ml cup. |
| Butter       | 0.9590         | USDA FDC ID 173430 (butter, salted): 230 g per 240 ml cup. |
| Yogurt       | 1.0300         | USDA FDC ID 170886 (yogurt, plain, whole milk): 247 g per 240 ml cup. |
| Tomato Paste | 1.0750         | USDA FDC ID 170040 (tomato products, canned, paste): 258 g per 240 ml cup. |
| Cream        | 1.0050         | USDA FDC ID 170859 (cream, fluid, heavy whipping): 241 g per 240 ml cup. |

## Conventions

- 1 cup = 240 ml (US legal/labelling cup), to match the engine's volume table.
- Where multiple USDA portions are available, prefer the "1 cup" portion.
- Round to 4 decimal places; the model column is `DecimalField(max_digits=8, decimal_places=4)`.
- Ingredient names must match exactly the names seeded by `0005_seed_ingredients_units.py` so the seeder can `get_or_create` against the same row.
