from django.db import migrations, models
import apps.common.ids as common_ids


def backfill_recipe_public_ids(apps, schema_editor):
    Recipe = apps.get_model('recipes', 'Recipe')
    used_ids = set(
        Recipe.objects.exclude(public_id__isnull=True)
        .exclude(public_id='')
        .values_list('public_id', flat=True)
    )

    for recipe in Recipe.objects.filter(public_id__isnull=True):
        public_id = common_ids.generate_ulid()
        while public_id in used_ids:
            public_id = common_ids.generate_ulid()
        used_ids.add(public_id)
        recipe.public_id = public_id
        recipe.save(update_fields=['public_id'])


def clear_recipe_public_ids(apps, schema_editor):
    Recipe = apps.get_model('recipes', 'Recipe')
    Recipe.objects.update(public_id=None)


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0016_merge_20260509_1145'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='public_id',
            field=models.CharField(editable=False, max_length=26, null=True),
        ),
        migrations.RunPython(backfill_recipe_public_ids, clear_recipe_public_ids),
        migrations.AlterField(
            model_name='recipe',
            name='public_id',
            field=models.CharField(
                default=common_ids.generate_ulid,
                editable=False,
                max_length=26,
                unique=True,
                validators=[common_ids.validate_ulid],
            ),
        ),
    ]
