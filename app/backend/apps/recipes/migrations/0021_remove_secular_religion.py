from django.db import migrations


def remove_secular_none(apps, schema_editor):
    Religion = apps.get_model('recipes', 'Religion')
    Religion.objects.filter(name='Secular/None').delete()


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "0020_recipe_heritage_fields_585"),
    ]
    operations = [
        migrations.RunPython(remove_secular_none, migrations.RunPython.noop),
    ]
