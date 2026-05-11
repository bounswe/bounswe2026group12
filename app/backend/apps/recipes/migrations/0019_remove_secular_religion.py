from django.db import migrations


def remove_secular_none(apps, schema_editor):
    Religion = apps.get_model('recipes', 'Religion')
    Religion.objects.filter(name='Secular/None').delete()


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "0018_ingredient_unit_dietary_tag_audit_fields_361"),
    ]
    operations = [
        migrations.RunPython(remove_secular_none, migrations.RunPython.noop),
    ]
