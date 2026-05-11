from django.db import migrations


def backfill_passports(apps, schema_editor):
    """Create a CulturalPassport for every existing user (#583).

    Idempotent: get_or_create skips users that already have one. Safe to run
    on databases where some users were created before this app shipped and
    so missed the post_save signal.
    """
    User = apps.get_model('users', 'User')
    CulturalPassport = apps.get_model('passport', 'CulturalPassport')
    for user in User.objects.all().iterator():
        CulturalPassport.objects.get_or_create(user=user)


def noop_reverse(apps, schema_editor):
    """Reverse is a no-op; passport rows stick around if we roll back."""
    return


class Migration(migrations.Migration):

    dependencies = [
        ('passport', '0001_initial'),
        ('users', '0004_alter_user_is_contactable'),
    ]

    operations = [
        migrations.RunPython(backfill_passports, noop_reverse),
    ]
