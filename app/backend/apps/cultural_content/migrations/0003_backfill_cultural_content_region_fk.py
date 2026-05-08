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

    for cc in CulturalContent.objects.all():
        # region_text was just added; populate it from whatever region holds now
        # (at this point 'region' is the FK field — SQLite stores NULL or an int).
        # We stored the original text in region_text already via 0002.
        # Attempt to resolve the FK using the text.
        text = (cc.region_text or '').strip().lower()
        if text and cc.region_id is None:
            matched = region_cache.get(text)
            if matched:
                cc.region = matched
                cc.save(update_fields=['region'])


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
