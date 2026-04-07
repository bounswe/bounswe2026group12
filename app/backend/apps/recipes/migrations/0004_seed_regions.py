from django.db import migrations


REGIONS = [
    # Turkey
    "Aegean",
    "Anatolian",
    "Black Sea",
    "Marmara",
    "Mediterranean",
    "Southeastern Anatolia",
    # Middle East
    "Levantine",
    "Persian",
    "Arabian",
    # Europe
    "Balkan",
    "Central European",
    "Eastern European",
    "French",
    "Iberian",
    "Italian",
    "Nordic",
    "British Isles",
    # Asia
    "Central Asian",
    "Chinese",
    "Indian",
    "Japanese",
    "Korean",
    "Southeast Asian",
    # Africa
    "East African",
    "North African",
    "West African",
    # Americas
    "Caribbean",
    "Central American",
    "North American",
    "South American",
    # Oceania
    "Oceanian",
]


def seed_regions(apps, schema_editor):
    Region = apps.get_model("recipes", "Region")
    for name in REGIONS:
        Region.objects.get_or_create(name=name)


def unseed_regions(apps, schema_editor):
    Region = apps.get_model("recipes", "Region")
    Region.objects.filter(name__in=REGIONS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0003_recipe_qa_enabled"),
    ]

    operations = [
        migrations.RunPython(seed_regions, unseed_regions),
    ]
