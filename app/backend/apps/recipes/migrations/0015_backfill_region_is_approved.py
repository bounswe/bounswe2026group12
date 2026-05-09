from django.db import migrations


def backfill_region_approval(apps, schema_editor):
    """Existing regions predate the moderation flag and were curated by admins
    or seeded via 0004_seed_regions, so they are implicitly approved."""
    Region = apps.get_model('recipes', 'Region')
    Region.objects.filter(is_approved=False).update(is_approved=True)


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0014_eventtag_rejection_reason_eventtag_reviewed_at_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_region_approval, reverse_noop),
    ]
