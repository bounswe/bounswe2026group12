"""Idempotent seeder for Region geo data and per-recipe map coordinates.

Closes the gap behind the blank map pages (#721, #678, #657): Region rows
ship with nullable latitude/longitude and bbox_* fields, and seed_canonical
creates regions from recipe data without populating any of them, so
GET /api/map/regions/ (which defaults to geo_only=true) returns an empty
list and the web /map and mobile map screens render nothing.

This command runs *after* seed_canonical. It does not touch
seed_canonical.py / seed_canonical.json; it patches existing rows directly:

  1. For every Region whose name is in fixtures/region_geo.json, set the six
     geo fields (latitude, longitude, bbox_north, bbox_south, bbox_east,
     bbox_west). Fixture keys with no matching region, and regions absent
     from the fixture, are skipped with a warning.
  2. For every Recipe whose region now has a bounding box, set the recipe's
     latitude/longitude to a deterministic point inside that bbox (the RNG
     is seeded with the recipe id, so reruns produce the same point).
     Recipes whose id is divisible by 7 are intentionally left without
     coordinates so the "Without a location" path (#464) stays exercised.

Idempotent: rerunning re-applies the same values.
"""
import json
import random
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.recipes.models import Recipe, Region


# Recipes whose id is divisible by this are intentionally left without
# coordinates (the "Without a location" bucket). Keeps the share of located
# recipes around 85%, comfortably above the 70% acceptance bar in #721.
UNLOCATED_RECIPE_ID_MODULUS = 7

GEO_FIELDS = ('latitude', 'longitude', 'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west')

FIXTURE_PATH = Path(settings.BASE_DIR) / 'fixtures' / 'region_geo.json'


def _fixture_path():
    """Locate fixtures/region_geo.json relative to the backend project root."""
    if FIXTURE_PATH.exists():
        return FIXTURE_PATH
    # Fallback: walk up from this file to find a sibling fixtures/ directory.
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / 'fixtures' / 'region_geo.json'
        if candidate.exists():
            return candidate
    raise CommandError(f'region_geo fixture not found (looked at {FIXTURE_PATH})')


def _point_in_bbox(region, rng):
    """A deterministic point inside the region's bounding box.

    Quantized to 6 decimal places to match Recipe.latitude/longitude
    (DecimalField, max_digits=9, decimal_places=6).
    """
    lat = rng.uniform(region.bbox_south, region.bbox_north)
    lng = rng.uniform(region.bbox_west, region.bbox_east)
    q = Decimal('0.000001')
    return Decimal(repr(lat)).quantize(q), Decimal(repr(lng)).quantize(q)


class Command(BaseCommand):
    help = (
        'Seed Region latitude/longitude/bbox from fixtures/region_geo.json and '
        'assign each Recipe a stable point inside its region bbox. Recipes whose '
        f'id is divisible by {UNLOCATED_RECIPE_ID_MODULUS} are intentionally left '
        'without coordinates. Idempotent; run after seed_canonical.'
    )

    def handle(self, *args, **options):
        with _fixture_path().open(encoding='utf-8') as fh:
            fixture = json.load(fh)

        regions_seeded = self._seed_regions(fixture)
        recipes_seeded, recipes_unlocated = self._seed_recipes()

        self.stdout.write(self.style.SUCCESS(
            f'Seeded geo for {regions_seeded} regions, {recipes_seeded} recipes '
            f'({recipes_unlocated} recipes left without coordinates).'
        ))

    def _seed_regions(self, fixture):
        existing = {r.name: r for r in Region.objects.all()}
        seeded = 0
        for name, geo in fixture.items():
            region = existing.get(name)
            if region is None:
                self.stdout.write(self.style.WARNING(
                    f'  fixture region {name!r} has no matching Region row; skipping'
                ))
                continue
            for field in GEO_FIELDS:
                setattr(region, field, geo[field])
            region.save(update_fields=list(GEO_FIELDS))
            seeded += 1
        for name in existing:
            if name not in fixture:
                self.stdout.write(self.style.WARNING(
                    f'  region {name!r} is not in the geo fixture; left without coordinates'
                ))
        return seeded

    def _seed_recipes(self):
        seeded = 0
        unlocated = 0
        for recipe in Recipe.objects.select_related('region').iterator():
            region = recipe.region
            has_bbox = region is not None and None not in (
                region.bbox_north, region.bbox_south, region.bbox_east, region.bbox_west,
            )
            if recipe.id % UNLOCATED_RECIPE_ID_MODULUS == 0 or not has_bbox:
                if recipe.latitude is not None or recipe.longitude is not None:
                    recipe.latitude = None
                    recipe.longitude = None
                    recipe.save(update_fields=['latitude', 'longitude'])
                unlocated += 1
                continue
            rng = random.Random(recipe.id)
            lat, lng = _point_in_bbox(region, rng)
            if recipe.latitude != lat or recipe.longitude != lng:
                recipe.latitude = lat
                recipe.longitude = lng
                recipe.save(update_fields=['latitude', 'longitude'])
            seeded += 1
        return seeded, unlocated
