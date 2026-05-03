"""Seed culturally grounded ingredient substitutions (M5-02 / #363).

Pairs are drawn from the 45 ingredients seeded by 0005_seed_ingredients_units
and curated for Turkish, Mediterranean, and Balkan cuisines. Idempotent:
get_or_create is keyed on (from, to, match_type) so re-running cannot
collide. Reverse migration removes only the rows it inserted.
"""
from decimal import Decimal

from django.db import migrations


SUBSTITUTIONS = [
    # (from, to, match_type, closeness, notes)
    # --- Fats / oils ---
    ('Butter', 'Olive Oil', 'flavor', '0.70', 'Use ~75% volume; expect milder result'),
    ('Butter', 'Olive Oil', 'texture', '0.60', ''),
    ('Olive Oil', 'Butter', 'flavor', '0.65', 'Adds dairy depth; reduce salt'),
    ('Olive Oil', 'Butter', 'texture', '0.55', 'Solid at room temperature'),

    # --- Dairy ---
    ('Yogurt', 'Cream', 'texture', '0.85', 'Strain yogurt for a thicker result'),
    ('Cream', 'Yogurt', 'texture', '0.75', 'Tangier; reduce other acids'),
    ('Yogurt', 'Tahini', 'chemical', '0.55', 'Different binding; reduce liquid'),
    ('Tahini', 'Yogurt', 'chemical', '0.55', 'Increase liquid in dressings'),

    # --- Cheeses ---
    ('Feta Cheese', 'Mozzarella', 'texture', '0.70', 'Lower salt content; salt to taste'),
    ('Feta Cheese', 'Mozzarella', 'flavor', '0.45', 'Much milder; consider adding lemon'),
    ('Mozzarella', 'Feta Cheese', 'flavor', '0.50', 'Saltier and tangier'),
    ('Mozzarella', 'Feta Cheese', 'texture', '0.65', 'Crumblier; will not stretch'),

    # --- Meats ---
    ('Ground Lamb', 'Ground Beef', 'flavor', '0.80', 'Add cumin to mimic gaminess'),
    ('Ground Beef', 'Ground Lamb', 'flavor', '0.80', 'More gamey; reduce added spices'),
    ('Lamb', 'Chicken', 'texture', '0.55', 'Drier; brine before cooking'),
    ('Chicken', 'Lamb', 'flavor', '0.45', 'Much richer; reduce fat elsewhere'),

    # --- Nuts ---
    ('Walnuts', 'Pistachios', 'flavor', '0.75', ''),
    ('Walnuts', 'Pistachios', 'texture', '0.85', ''),
    ('Pistachios', 'Walnuts', 'flavor', '0.75', ''),
    ('Pistachios', 'Walnuts', 'texture', '0.85', ''),
    ('Pine Nuts', 'Walnuts', 'flavor', '0.55', 'Toast lightly to mimic resinous notes'),
    ('Walnuts', 'Pine Nuts', 'flavor', '0.55', 'Milder; use in pesto / garnish'),

    # --- Vegetables ---
    ('Eggplant', 'Zucchini', 'texture', '0.60', 'Cooks faster; reduce roast time'),
    ('Zucchini', 'Eggplant', 'texture', '0.60', 'Salt and drain to remove bitterness'),
    ('Green Pepper', 'Red Pepper Flakes', 'flavor', '0.45', 'Use sparingly; flakes are dry heat'),
    ('Red Pepper Flakes', 'Paprika', 'flavor', '0.65', 'Less heat, more sweetness'),
    ('Paprika', 'Red Pepper Flakes', 'flavor', '0.60', 'Hotter; reduce quantity'),

    # --- Acids / aromatics ---
    ('Lemon', 'Sumac', 'flavor', '0.65', 'Sumac is dry — adjust acidity in liquids'),
    ('Sumac', 'Lemon', 'flavor', '0.65', 'Wetter; reduce other liquids'),
    ('Mint', 'Parsley', 'flavor', '0.50', 'Less sweet; brighter color'),
    ('Parsley', 'Mint', 'flavor', '0.50', 'Sweeter; pairs differently with lamb'),
    ('Cinnamon', 'Cumin', 'flavor', '0.30', 'Savoury rather than sweet; very different result'),

    # --- Starches / grains ---
    ('Rice', 'Pasta', 'texture', '0.55', 'Cooks faster; absorbs less liquid'),
    ('Pasta', 'Rice', 'texture', '0.55', 'Absorbs more liquid; adjust stock'),
    ('Flour', 'Lentils', 'chemical', '0.30', 'Use lentil flour only; whole lentils will not bind'),

    # --- Sweeteners ---
    ('Honey', 'Sugar', 'flavor', '0.65', 'Drier substitute; reduce other liquids by ~20%'),
    ('Sugar', 'Honey', 'flavor', '0.65', 'Wetter substitute; reduce other liquids'),

    # --- Aromatics ---
    ('Garlic', 'Onion', 'flavor', '0.50', 'Sweeter; double the volume for similar punch'),
    ('Onion', 'Garlic', 'flavor', '0.45', 'Sharper; halve the volume'),
    ('Ginger', 'Garlic', 'flavor', '0.30', 'Very different profile; only viable in some marinades'),

    # --- Phyllo / dough ---
    ('Phyllo Dough', 'Flour', 'chemical', '0.20', 'Only as a base for fresh dough; not a like-for-like swap'),

    # --- Extra Mediterranean / Balkan pairs ---
    ('Thyme', 'Oregano', 'flavor', '0.80', 'Slightly more floral; usable 1:1'),
    ('Oregano', 'Thyme', 'flavor', '0.80', 'Earthier; usable 1:1'),
    ('Tomato', 'Tomato Paste', 'chemical', '0.55', 'Much more concentrated; dilute with water'),
    ('Tomato Paste', 'Tomato', 'chemical', '0.55', 'Much more liquid; reduce other liquids'),
    ('Sesame Seeds', 'Pine Nuts', 'texture', '0.55', 'Smaller; adds nuttiness in different distribution'),
    ('Turmeric', 'Cumin', 'flavor', '0.25', 'Different family; only loosely interchangeable'),
]


def seed_substitutions(apps, schema_editor):
    Ingredient = apps.get_model('recipes', 'Ingredient')
    IngredientSubstitution = apps.get_model('recipes', 'IngredientSubstitution')

    name_to_obj = {ing.name: ing for ing in Ingredient.objects.all()}
    missing = set()

    for from_name, to_name, match_type, closeness, notes in SUBSTITUTIONS:
        from_ing = name_to_obj.get(from_name)
        to_ing = name_to_obj.get(to_name)
        if not from_ing or not to_ing:
            missing.add(from_name if not from_ing else to_name)
            continue
        IngredientSubstitution.objects.get_or_create(
            from_ingredient=from_ing,
            to_ingredient=to_ing,
            match_type=match_type,
            defaults={'closeness': Decimal(closeness), 'notes': notes},
        )

    if missing:
        # Surface unseeded ingredient names so future authors can fix the seed list
        # rather than letting silent skips accumulate. Django wraps the migration
        # in a transaction, so raising here rolls back any rows already inserted —
        # partial seed state cannot persist.
        raise RuntimeError(
            f"Substitution seed references ingredients that are not seeded: {sorted(missing)}"
        )


def unseed_substitutions(apps, schema_editor):
    Ingredient = apps.get_model('recipes', 'Ingredient')
    IngredientSubstitution = apps.get_model('recipes', 'IngredientSubstitution')

    name_to_id = {ing.name: ing.id for ing in Ingredient.objects.all()}
    for from_name, to_name, match_type, _closeness, _notes in SUBSTITUTIONS:
        from_id = name_to_id.get(from_name)
        to_id = name_to_id.get(to_name)
        if from_id and to_id:
            IngredientSubstitution.objects.filter(
                from_ingredient_id=from_id,
                to_ingredient_id=to_id,
                match_type=match_type,
            ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0009_ingredient_substitution'),
    ]

    operations = [
        migrations.RunPython(seed_substitutions, unseed_substitutions),
    ]
