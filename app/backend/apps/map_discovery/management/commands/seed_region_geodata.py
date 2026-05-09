"""seed_region_geodata — populate geographic coordinates for Region records.

Usage:
    python manage.py seed_region_geodata
    python manage.py seed_region_geodata --dry-run        # preview changes
    python manage.py seed_region_geodata --overwrite      # overwrite existing coords

The command ships a built-in dataset of common cultural/geographic regions.
Any Region whose name (case-insensitive) matches an entry in GEO_DATA will
have its latitude, longitude, bbox_*, and parent fields set.

Admins can always override coordinates through the Django admin UI.
"""

from django.core.management.base import BaseCommand
from apps.recipes.models import Region

# ---------------------------------------------------------------------------
# Built-in geo seed data
# Format: name → {lat, lon, bbox_N, bbox_S, bbox_E, bbox_W, parent_name}
# bbox values are approximate cultural/political boundaries.
# parent_name must itself be a key in this dict (resolved after all records
# are created/updated).
# ---------------------------------------------------------------------------
GEO_DATA = {
    # ── Top-level macro-regions ─────────────────────────────────────────────
    'Turkey': {
        'lat': 39.0, 'lon': 35.0,
        'bbox': (42.1, 35.8, 44.8, 25.7),
        'parent': None,
    },
    'Mediterranean': {
        'lat': 35.0, 'lon': 18.0,
        'bbox': (46.0, 30.0, 36.0, -5.0),
        'parent': None,
    },
    'Middle East': {
        'lat': 29.0, 'lon': 42.0,
        'bbox': (42.0, 12.0, 63.0, 25.0),
        'parent': None,
    },
    'South Asia': {
        'lat': 20.0, 'lon': 77.0,
        'bbox': (37.0, 5.0, 97.0, 60.0),
        'parent': None,
    },
    'East Asia': {
        'lat': 35.0, 'lon': 110.0,
        'bbox': (53.0, 18.0, 145.0, 73.0),
        'parent': None,
    },
    'Southeast Asia': {
        'lat': 10.0, 'lon': 115.0,
        'bbox': (28.0, -11.0, 141.0, 92.0),
        'parent': None,
    },
    'Europe': {
        'lat': 50.0, 'lon': 15.0,
        'bbox': (71.0, 35.0, 40.0, -25.0),
        'parent': None,
    },
    'Africa': {
        'lat': 5.0, 'lon': 20.0,
        'bbox': (37.0, -35.0, 52.0, -18.0),
        'parent': None,
    },
    'Americas': {
        'lat': 15.0, 'lon': -80.0,
        'bbox': (83.0, -56.0, -34.0, -168.0),
        'parent': None,
    },

    # ── Turkey sub-regions ──────────────────────────────────────────────────
    'Anatolia': {
        'lat': 39.2, 'lon': 35.5,
        'bbox': (42.0, 36.0, 44.8, 26.0),
        'parent': 'Turkey',
    },
    'Aegean': {
        'lat': 38.2, 'lon': 27.5,
        'bbox': (39.8, 36.5, 29.5, 25.7),
        'parent': 'Turkey',
    },
    'Marmara': {
        'lat': 40.5, 'lon': 28.5,
        'bbox': (41.9, 39.5, 32.0, 26.0),
        'parent': 'Turkey',
    },
    'Black Sea': {
        'lat': 41.2, 'lon': 37.0,
        'bbox': (42.1, 40.5, 43.0, 30.5),
        'parent': 'Turkey',
    },
    'Southeast Anatolia': {
        'lat': 37.5, 'lon': 40.0,
        'bbox': (39.0, 36.0, 44.8, 36.5),
        'parent': 'Turkey',
    },
    'Eastern Anatolia': {
        'lat': 39.5, 'lon': 42.5,
        'bbox': (40.5, 37.5, 44.8, 38.0),
        'parent': 'Turkey',
    },
    'Central Anatolia': {
        'lat': 39.0, 'lon': 33.5,
        'bbox': (41.0, 37.0, 37.0, 29.5),
        'parent': 'Turkey',
    },
    'Mediterranean Coast': {
        'lat': 36.8, 'lon': 31.5,
        'bbox': (37.5, 35.5, 36.5, 28.0),
        'parent': 'Turkey',
    },

    # ── Middle East sub-regions ─────────────────────────────────────────────
    'Levant': {
        'lat': 33.5, 'lon': 36.5,
        'bbox': (37.0, 29.0, 42.0, 34.5),
        'parent': 'Middle East',
    },
    'Persian Gulf': {
        'lat': 26.0, 'lon': 51.0,
        'bbox': (30.0, 22.0, 56.0, 47.0),
        'parent': 'Middle East',
    },
    'North Africa': {
        'lat': 28.0, 'lon': 20.0,
        'bbox': (37.5, 19.0, 37.0, -5.5),
        'parent': 'Africa',
    },

    # ── South Asia sub-regions ──────────────────────────────────────────────
    'Indian Subcontinent': {
        'lat': 22.0, 'lon': 79.0,
        'bbox': (37.0, 5.0, 97.0, 60.0),
        'parent': 'South Asia',
    },

    # ── East Asia sub-regions ───────────────────────────────────────────────
    'East China': {
        'lat': 32.0, 'lon': 115.0,
        'bbox': (41.0, 22.0, 122.0, 108.0),
        'parent': 'East Asia',
    },
    'Korean Peninsula': {
        'lat': 36.5, 'lon': 127.5,
        'bbox': (42.5, 33.5, 129.5, 124.0),
        'parent': 'East Asia',
    },
    'Japan': {
        'lat': 36.0, 'lon': 138.0,
        'bbox': (45.5, 24.0, 145.8, 122.9),
        'parent': 'East Asia',
    },
}


class Command(BaseCommand):
    help = (
        'Seed Region records with geographic coordinates for map discovery (#381). '
        'Existing coordinates are preserved by default; use --overwrite to replace them.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print what would change without writing to the database.',
        )
        parser.add_argument(
            '--overwrite', action='store_true',
            help='Overwrite coordinates even if they are already set.',
        )

    def handle(self, *args, **options):
        dry_run   = options['dry_run']
        overwrite = options['overwrite']
        updated   = 0
        skipped   = 0
        not_found = []

        # First pass: update coordinates
        for name, data in GEO_DATA.items():
            try:
                region = Region.objects.get(name__iexact=name)
            except Region.DoesNotExist:
                not_found.append(name)
                continue

            already_has_coords = region.latitude is not None and region.longitude is not None
            if already_has_coords and not overwrite:
                skipped += 1
                self.stdout.write(f'  SKIP  {region.name} (already has coordinates)')
                continue

            bbox = data.get('bbox')  # (N, S, E, W)
            if not dry_run:
                region.latitude   = data['lat']
                region.longitude  = data['lon']
                if bbox:
                    region.bbox_north = bbox[0]
                    region.bbox_south = bbox[1]
                    region.bbox_east  = bbox[2]
                    region.bbox_west  = bbox[3]
                region.save(update_fields=[
                    'latitude', 'longitude',
                    'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west',
                ])

            updated += 1
            action = 'DRY-RUN' if dry_run else 'UPDATE'
            self.stdout.write(
                f'  {action}  {region.name}: ({data["lat"]}, {data["lon"]})'
            )

        # Second pass: set parent FKs (after all regions have been touched)
        for name, data in GEO_DATA.items():
            parent_name = data.get('parent')
            if not parent_name:
                continue
            try:
                region = Region.objects.get(name__iexact=name)
                parent = Region.objects.get(name__iexact=parent_name)
            except Region.DoesNotExist:
                continue

            if region.parent_id != parent.id:
                if not dry_run:
                    region.parent = parent
                    region.save(update_fields=['parent'])
                self.stdout.write(
                    f'  PARENT  {region.name} → {parent.name}'
                    + (' (dry-run)' if dry_run else '')
                )

        # Summary
        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Updated: {updated}, Skipped (already had coords): {skipped}.'
        ))
        if not_found:
            self.stdout.write(self.style.WARNING(
                f'Regions in GEO_DATA not found in DB (create them first):\n'
                + '\n'.join(f'  - {n}' for n in not_found)
            ))
