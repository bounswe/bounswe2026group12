"""Re-seed the Region table from the current 0004_seed_regions list (#841).

0004_seed_regions was edited in place after it had already been applied: its
REGIONS list started as ~31 macro-regions and later grew to include
country-level regions (France, Germany, Saudi Arabia, China, ...). Long-lived
DBs that applied 0004 against the original list never got the added names, so
`seed_canonical` — which resolves regions with a strict get() — fails there
("Region 'Saudi Arabia' not found").

This migration get_or_creates every name in 0004's *current* REGIONS list, so
it back-fills the missing rows on old DBs and is a no-op on fresh ones. New
rows are is_approved=True (the model default is False; 0004's originals were
backfilled by 0015_backfill_region_is_approved).

We import REGIONS from 0004 rather than copying it so the two stay in sync if
the list grows again. Reverse is a no-op: 0004's own reverse already deletes
everything in REGIONS, so there is nothing extra to undo here.

Follow-up (#841): move REGIONS into a non-migration module so it has a single
source of truth and stops silently drifting.
"""
import importlib

from django.db import migrations

_seed_regions = importlib.import_module("apps.recipes.migrations.0004_seed_regions")


def reseed_regions(apps, schema_editor):
    Region = apps.get_model("recipes", "Region")
    for name in _seed_regions.REGIONS:
        Region.objects.get_or_create(name=name, defaults={"is_approved": True})


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0029_list_ordering_pk_tiebreaker_770"),
    ]

    operations = [
        migrations.RunPython(reseed_regions, reverse_noop),
    ]
