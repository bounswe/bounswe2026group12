from django.db import migrations


INGREDIENTS = [
    "Butter", "Chicken", "Cinnamon", "Cream", "Cumin", "Eggplant",
    "Eggs", "Feta Cheese", "Flour", "Garlic", "Ginger", "Green Pepper",
    "Ground Beef", "Ground Lamb", "Honey", "Lamb", "Lemon", "Lentils",
    "Mint", "Mozzarella", "Olive Oil", "Onion", "Oregano", "Paprika",
    "Parsley", "Pasta", "Pepper", "Phyllo Dough", "Pine Nuts", "Pistachios",
    "Potato", "Red Pepper Flakes", "Rice", "Salt", "Sesame Seeds",
    "Sugar", "Sumac", "Tahini", "Thyme", "Tomato", "Tomato Paste",
    "Turmeric", "Walnuts", "Yogurt", "Zucchini",
]

UNITS = [
    "grams", "kg", "liters", "ml", "cups", "tablespoons", "teaspoons",
    "pieces", "cloves", "pinch", "bunch", "slices",
]


def seed_ingredients(apps, schema_editor):
    Ingredient = apps.get_model("recipes", "Ingredient")
    for name in INGREDIENTS:
        Ingredient.objects.get_or_create(name=name, defaults={"is_approved": True})


def unseed_ingredients(apps, schema_editor):
    Ingredient = apps.get_model("recipes", "Ingredient")
    Ingredient.objects.filter(name__in=INGREDIENTS).delete()


def seed_units(apps, schema_editor):
    Unit = apps.get_model("recipes", "Unit")
    for name in UNITS:
        Unit.objects.get_or_create(name=name, defaults={"is_approved": True})


def unseed_units(apps, schema_editor):
    Unit = apps.get_model("recipes", "Unit")
    Unit.objects.filter(name__in=UNITS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0004_seed_regions"),
    ]

    operations = [
        migrations.RunPython(seed_ingredients, unseed_ingredients),
        migrations.RunPython(seed_units, unseed_units),
    ]
