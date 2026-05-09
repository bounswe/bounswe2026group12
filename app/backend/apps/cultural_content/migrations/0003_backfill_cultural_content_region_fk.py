"""Data migration: backfill CulturalContent.region FK from the old CharField.

For every CulturalContent row where `region` text was previously stored,
we try to match it (case-insensitively) to an existing Region record and set
the FK.  We also copy the old text into `region_text` for auditability.
Rows that don't match any Region are left with region=NULL; region_text
will still hold the original string.
"""

from django.db import migrations


def backfill_region_fk(apps, schema_editor):
    CulturalContent = apps.get_model('cultural_content', 'CulturalContent')
    Region          = apps.get_model('recipes', 'Region')

    region_cache = {r.name.lower(): r for r in Region.objects.all()}
    to_update = []

    for cc in CulturalContent.objects.filter(region__isnull=True):
        text = (cc.region_text or '').strip().lower()
        if text and text in region_cache:
            cc.region = region_cache[text]
            to_update.append(cc)

    if to_update:
        CulturalContent.objects.bulk_update(to_update, ['region'])


def reverse_backfill(apps, schema_editor):
    """Reverse: clear the FK, leaving region_text intact."""
    CulturalContent = apps.get_model('cultural_content', 'CulturalContent')
    CulturalContent.objects.update(region=None)


class Migration(migrations.Migration):

    dependencies = [
        ('cultural_content', '0002_culturalcontent_region_text_and_more'),
        ('recipes', '0011_region_bbox_east_region_bbox_north_region_bbox_south_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_region_fk, reverse_code=reverse_backfill),
    ]
