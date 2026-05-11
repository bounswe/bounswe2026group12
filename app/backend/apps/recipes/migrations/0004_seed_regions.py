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
    "Saudi Arabia",
    # Europe
    "Balkan",
    "Central European",
    "Eastern European",
    "French",
    "Iberian",
    "Italian",
    "Nordic",
    "British Isles",
    "France",
    "Germany",
    "Greece",
    "Hungary",
    "Poland",
    "Portugal",
    "Russia",
    "Spain",
    "United Kingdom",
    # Asia
    "Central Asian",
    "Chinese",
    "Indian",
    "Japanese",
    "Korean",
    "Southeast Asian",
    "China",
    "South Korea",
    "Thailand",
    "Vietnam",
    "Kyrgyzstan",
    "Uzbekistan",
    # Africa
    "East African",
    "North African",
    "West African",
    "Ethiopia",
    "Ghana",
    "Morocco",
    "Nigeria",
    # Americas
    "Caribbean",
    "Central American",
    "North American",
    "South American",
    "Argentina",
    "Brazil",
    "El Salvador",
    "Jamaica",
    "Peru",
    "Trinidad and Tobago",
    # Oceania
    "Oceanian",
    "Australia",
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
