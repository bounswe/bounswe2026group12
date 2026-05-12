"""Idempotent seeder for Story latitude/longitude coordinates (#757).

Closes the gap that makes story pins invisible on the region map: Story rows
have nullable latitude/longitude fields (added in #730), but no existing story
row has them populated — so every GET /api/stories/?region={id} returns
lat=None, lng=None and no pins render.

Run this command *after* seed_canonical AND seed_region_geo:

    python manage.py seed_canonical
    python manage.py seed_region_geo        # populates Region bbox fields
    python manage.py seed_story_coordinates # this command

For every Story where both latitude and longitude are null:
  - If the story's region has a bounding box, assign a deterministic point
    inside that bbox (RNG seeded with the story id, so reruns are stable).
  - If the story has no region, or the region has no bbox, leave it null.

Stories that already have coordinates are skipped (idempotent).
"""
import random
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.stories.models import Story


def _point_in_bbox(region, rng):
    """Return a deterministic (lat, lng) Decimal pair inside the region bbox.

    Quantized to 6 decimal places to match Story.latitude/longitude
    (DecimalField, max_digits=9, decimal_places=6).
    """
    lat = rng.uniform(region.bbox_south, region.bbox_north)
    lng = rng.uniform(region.bbox_west, region.bbox_east)
    q = Decimal('0.000001')
    return Decimal(repr(lat)).quantize(q), Decimal(repr(lng)).quantize(q)


class Command(BaseCommand):
    help = (
        'Seed Story latitude/longitude from the story region bounding box. '
        'Idempotent — skips rows that already have coordinates. '
        'Run after seed_canonical and seed_region_geo.'
    )

    def handle(self, *args, **options):
        seeded, already_set, no_region, no_bbox = self._seed_stories()
        self.stdout.write(self.style.SUCCESS(
            f'seed_story_coordinates: seeded {seeded} stories. '
            f'Skipped: {already_set} already had coords, '
            f'{no_region} had no region, '
            f'{no_bbox} had no region bbox.'
        ))

    def _seed_stories(self):
        seeded = 0
        already_set = 0
        no_region = 0
        no_bbox = 0
        for story in Story.objects.select_related('region').iterator():
            if story.latitude is not None and story.longitude is not None:
                already_set += 1
                continue
            region = story.region
            if region is None:
                no_region += 1
                continue
            has_bbox = None not in (
                region.bbox_north, region.bbox_south,
                region.bbox_east, region.bbox_west,
            )
            if not has_bbox:
                no_bbox += 1
                continue
            rng = random.Random(story.id)
            lat, lng = _point_in_bbox(region, rng)
            story.latitude = lat
            story.longitude = lng
            story.save(update_fields=['latitude', 'longitude'])
            seeded += 1
        return seeded, already_set, no_region, no_bbox
