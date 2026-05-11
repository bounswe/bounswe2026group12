"""Idempotent seeder for IngredientRoute migration waypoints (#523).

Seeds ordered, time-ordered waypoints for 10 iconic ingredients so the
"Ingredient Migration Routes" map overlay (#506, web #514, mobile #513) has
data to draw on a fresh database. Get-or-create on the Ingredient by name so
this composes with the migration-seeded ingredients (0005) instead of
duplicating them; then upsert the route's waypoints. Safe to rerun.

Coordinates are approximate centroids of the named place; eras are
human-readable periods, not precise dates. Sourced from common food-history
narratives (Columbian Exchange, Silk Road, Atlantic trade).
"""
from django.core.management.base import BaseCommand

from apps.recipes.models import Ingredient, IngredientRoute


# name -> ordered list of {lat, lng, era, label}
SEED_ROUTES = {
    'Tomato': [
        {'lat': -13.16, 'lng': -72.55, 'era': 'Pre-Columbian Andes', 'label': 'Andes (Peru)'},
        {'lat': 19.43, 'lng': -99.13, 'era': 'Aztec Mesoamerica', 'label': 'Valley of Mexico'},
        {'lat': 40.42, 'lng': -3.70, 'era': '1500s Spain', 'label': 'Seville / Madrid'},
        {'lat': 40.85, 'lng': 14.27, 'era': '1600s Italy', 'label': 'Naples'},
        {'lat': 41.01, 'lng': 28.98, 'era': '1700s Ottoman Empire', 'label': 'Istanbul'},
    ],
    'Potato': [
        {'lat': -15.84, 'lng': -70.02, 'era': 'Pre-Columbian Andes', 'label': 'Lake Titicaca basin'},
        {'lat': 28.29, 'lng': -16.63, 'era': 'Late 1500s', 'label': 'Canary Islands'},
        {'lat': 43.26, 'lng': -2.93, 'era': '1570s Spain', 'label': 'Basque Country'},
        {'lat': 53.35, 'lng': -6.26, 'era': '1700s Ireland', 'label': 'Ireland'},
        {'lat': 52.52, 'lng': 13.40, 'era': '1750s Prussia', 'label': 'Berlin'},
    ],
    'Chili Pepper': [
        {'lat': 19.43, 'lng': -99.13, 'era': 'Pre-Columbian Mesoamerica', 'label': 'Central Mexico'},
        {'lat': 38.72, 'lng': -9.14, 'era': '1500s Portugal', 'label': 'Lisbon'},
        {'lat': 15.30, 'lng': 74.08, 'era': '1500s India', 'label': 'Goa'},
        {'lat': 41.01, 'lng': 28.98, 'era': '1600s Ottoman Empire', 'label': 'Istanbul'},
        {'lat': 46.25, 'lng': 20.15, 'era': '1700s Hungary', 'label': 'Szeged (paprika)'},
    ],
    'Coffee': [
        {'lat': 7.68, 'lng': 36.83, 'era': 'Origin', 'label': 'Kaffa, Ethiopia'},
        {'lat': 13.96, 'lng': 44.17, 'era': '15th century', 'label': 'Mocha, Yemen'},
        {'lat': 41.01, 'lng': 28.98, 'era': '1500s Ottoman Empire', 'label': 'Istanbul'},
        {'lat': 48.21, 'lng': 16.37, 'era': '1683 Vienna', 'label': 'Vienna'},
        {'lat': -22.91, 'lng': -43.20, 'era': '1700s Brazil', 'label': 'Rio de Janeiro'},
    ],
    'Sugar': [
        {'lat': 6.69, 'lng': 147.0, 'era': 'Origin', 'label': 'New Guinea'},
        {'lat': 20.59, 'lng': 78.96, 'era': 'Ancient India', 'label': 'Gangetic Plain'},
        {'lat': 33.51, 'lng': 36.29, 'era': 'Medieval Levant', 'label': 'Damascus'},
        {'lat': 32.65, 'lng': -16.91, 'era': '1400s Atlantic', 'label': 'Madeira'},
        {'lat': -8.05, 'lng': -34.88, 'era': '1600s Brazil', 'label': 'Pernambuco'},
        {'lat': 18.47, 'lng': -77.92, 'era': '1700s Caribbean', 'label': 'Jamaica'},
    ],
    'Rice': [
        {'lat': 30.59, 'lng': 114.30, 'era': 'Neolithic China', 'label': 'Yangtze valley'},
        {'lat': 20.59, 'lng': 78.96, 'era': 'Ancient India', 'label': 'Ganges valley'},
        {'lat': 35.69, 'lng': 51.39, 'era': 'Persian era', 'label': 'Persia'},
        {'lat': 37.39, 'lng': -5.99, 'era': 'Al-Andalus', 'label': 'Valencia / Seville'},
        {'lat': 33.42, 'lng': -79.55, 'era': '1600s Carolinas', 'label': 'Lowcountry, South Carolina'},
    ],
    'Wheat': [
        {'lat': 37.07, 'lng': 38.79, 'era': 'Neolithic Fertile Crescent', 'label': 'Karacadag, Anatolia'},
        {'lat': 30.05, 'lng': 31.23, 'era': 'Ancient Egypt', 'label': 'Nile valley'},
        {'lat': 37.98, 'lng': 23.73, 'era': 'Classical Mediterranean', 'label': 'Athens'},
        {'lat': 41.90, 'lng': 12.50, 'era': 'Roman Empire', 'label': 'Rome'},
        {'lat': 49.90, 'lng': -97.14, 'era': '1800s North America', 'label': 'Canadian Prairies'},
    ],
    'Cinnamon': [
        {'lat': 7.29, 'lng': 80.64, 'era': 'Ancient origin', 'label': 'Sri Lanka'},
        {'lat': 30.05, 'lng': 31.23, 'era': 'Ancient Egypt', 'label': 'Alexandria'},
        {'lat': 41.90, 'lng': 12.50, 'era': 'Roman Empire', 'label': 'Rome'},
        {'lat': 45.44, 'lng': 12.34, 'era': 'Medieval trade', 'label': 'Venice'},
        {'lat': 38.72, 'lng': -9.14, 'era': '1500s Portugal', 'label': 'Lisbon'},
    ],
    'Chocolate': [
        {'lat': 17.99, 'lng': -92.93, 'era': 'Olmec / Maya', 'label': 'Gulf Coast, Mexico'},
        {'lat': 19.43, 'lng': -99.13, 'era': 'Aztec Empire', 'label': 'Tenochtitlan'},
        {'lat': 40.42, 'lng': -3.70, 'era': '1500s Spain', 'label': 'Madrid'},
        {'lat': 48.85, 'lng': 2.35, 'era': '1600s France', 'label': 'Paris'},
        {'lat': 46.95, 'lng': 7.45, 'era': '1800s Switzerland', 'label': 'Bern'},
    ],
    'Corn': [
        {'lat': 18.36, 'lng': -98.95, 'era': 'Domestication', 'label': 'Balsas valley, Mexico'},
        {'lat': 13.18, 'lng': -88.0, 'era': 'Pre-Columbian Mesoamerica', 'label': 'Maya lowlands'},
        {'lat': 38.83, 'lng': -77.04, 'era': 'Pre-Columbian North America', 'label': 'Eastern Woodlands'},
        {'lat': 38.72, 'lng': -9.14, 'era': '1500s Iberia', 'label': 'Lisbon'},
        {'lat': 41.90, 'lng': 12.50, 'era': '1600s Mediterranean', 'label': 'Italy (polenta)'},
        {'lat': 0.00, 'lng': 21.0, 'era': '1700s Africa', 'label': 'Congo Basin'},
    ],
}


class Command(BaseCommand):
    help = 'Seed IngredientRoute migration waypoints for 10 iconic ingredients (idempotent).'

    def handle(self, *args, **options):
        created = 0
        updated = 0
        skipped_unchanged = 0

        for name, waypoints in SEED_ROUTES.items():
            ingredient, _ = Ingredient.objects.get_or_create(
                name=name,
                defaults={'is_approved': True},
            )
            route = IngredientRoute.objects.filter(ingredient=ingredient).first()
            if route is None:
                IngredientRoute.objects.create(ingredient=ingredient, waypoints=waypoints)
                created += 1
                continue

            if route.waypoints == waypoints:
                skipped_unchanged += 1
                continue

            route.waypoints = waypoints
            route.save(update_fields=['waypoints', 'updated_at'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Ingredient routes seeded: {created} created, {updated} updated, {skipped_unchanged} unchanged.'
        ))
