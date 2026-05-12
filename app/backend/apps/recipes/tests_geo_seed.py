"""Tests for the seed_region_geo management command (#721, #678, #657).

Runs seed_canonical then seed_region_geo and verifies that regions get
center coordinates and a valid bounding box, that the map index endpoint
stops returning an empty list, and that a few recipes are intentionally
left without coordinates so the "Without a location" UI path stays exercised.
"""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.recipes.models import Recipe, Region


# Regions that must always end up with coordinates after the seed runs.
MAJOR_REGIONS = [
    'Aegean', 'Anatolian', 'Black Sea', 'Marmara', 'Mediterranean',
    'Southeastern Anatolia', 'Levantine', 'Persian', 'Arabian', 'Balkan',
    'Indian', 'Japanese', 'Chinese', 'Korean', 'French', 'Italian',
    'Iberian', 'Nordic', 'British Isles', 'North African',
]


class SeedRegionGeoCommandTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_canonical', stdout=StringIO())
        call_command('seed_region_geo', stdout=StringIO())

    def test_major_regions_have_center_coordinates(self):
        for name in MAJOR_REGIONS:
            region = Region.objects.filter(name=name).first()
            self.assertIsNotNone(region, f'expected region {name!r} to be seeded')
            self.assertIsNotNone(region.latitude, f'{name} latitude is null')
            self.assertIsNotNone(region.longitude, f'{name} longitude is null')

    def test_seeded_regions_have_a_valid_bounding_box(self):
        seeded = Region.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True)
        self.assertGreaterEqual(seeded.count(), len(MAJOR_REGIONS))
        for region in seeded:
            self.assertIsNotNone(region.bbox_north, f'{region.name} bbox_north is null')
            self.assertIsNotNone(region.bbox_south, f'{region.name} bbox_south is null')
            self.assertIsNotNone(region.bbox_east, f'{region.name} bbox_east is null')
            self.assertIsNotNone(region.bbox_west, f'{region.name} bbox_west is null')
            self.assertGreater(region.bbox_north, region.bbox_south,
                               f'{region.name} bbox north must be greater than south')
            self.assertGreater(region.bbox_east, region.bbox_west,
                               f'{region.name} bbox east must be greater than west')
            # Center should sit inside its own bounding box.
            self.assertLessEqual(region.bbox_south, region.latitude)
            self.assertGreaterEqual(region.bbox_north, region.latitude)

    def test_map_regions_endpoint_returns_geo_rows(self):
        client = APIClient()
        response = client.get('/api/map/regions/')
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.data), 0, 'map index should not be empty after seeding')
        for row in response.data:
            self.assertIsNotNone(row['latitude'])
            self.assertIsNotNone(row['longitude'])

    def test_recipes_get_coordinates_but_a_handful_stay_null(self):
        with_coords = Recipe.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True)
        without_coords = Recipe.objects.filter(latitude__isnull=True, longitude__isnull=True)
        self.assertGreater(with_coords.count(), 0, 'expected at least one located recipe')
        self.assertGreater(without_coords.count(), 0, 'expected at least one unlocated recipe')
        # The intentional gap is recipes whose id is divisible by 7.
        for recipe in without_coords:
            self.assertEqual(recipe.id % 7, 0)
        # And at least 70% of recipes should be located (issue acceptance bar).
        total = Recipe.objects.count()
        self.assertGreaterEqual(with_coords.count() / total, 0.7)

    def test_recipe_coordinates_lie_inside_their_region_bbox(self):
        for recipe in Recipe.objects.exclude(latitude__isnull=True).select_related('region'):
            region = recipe.region
            self.assertIsNotNone(region)
            self.assertGreaterEqual(float(recipe.latitude), region.bbox_south)
            self.assertLessEqual(float(recipe.latitude), region.bbox_north)
            self.assertGreaterEqual(float(recipe.longitude), region.bbox_west)
            self.assertLessEqual(float(recipe.longitude), region.bbox_east)

    def test_rerun_is_idempotent(self):
        first_region = {
            (r.name, r.latitude, r.longitude, r.bbox_north, r.bbox_south, r.bbox_east, r.bbox_west)
            for r in Region.objects.all()
        }
        first_recipe = {(r.id, r.latitude, r.longitude) for r in Recipe.objects.all()}

        call_command('seed_region_geo', stdout=StringIO())

        second_region = {
            (r.name, r.latitude, r.longitude, r.bbox_north, r.bbox_south, r.bbox_east, r.bbox_west)
            for r in Region.objects.all()
        }
        second_recipe = {(r.id, r.latitude, r.longitude) for r in Recipe.objects.all()}
        self.assertEqual(first_region, second_region)
        self.assertEqual(first_recipe, second_recipe)
