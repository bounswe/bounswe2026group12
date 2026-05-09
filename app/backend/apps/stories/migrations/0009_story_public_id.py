from django.db import migrations, models
import apps.common.ids as common_ids


def backfill_story_public_ids(apps, schema_editor):
    Story = apps.get_model('stories', 'Story')
    used_ids = set(
        Story.objects.exclude(public_id__isnull=True)
        .exclude(public_id='')
        .values_list('public_id', flat=True)
    )

    for story in Story.objects.filter(public_id__isnull=True):
        public_id = common_ids.generate_ulid()
        while public_id in used_ids:
            public_id = common_ids.generate_ulid()
        used_ids.add(public_id)
        story.public_id = public_id
        story.save(update_fields=['public_id'])


def clear_story_public_ids(apps, schema_editor):
    Story = apps.get_model('stories', 'Story')
    Story.objects.update(public_id=None)


class Migration(migrations.Migration):

    dependencies = [
        ('stories', '0008_story_dietary_tags_story_event_tags_story_religions'),
    ]

    operations = [
        migrations.AddField(
            model_name='story',
            name='public_id',
            field=models.CharField(editable=False, max_length=26, null=True),
        ),
        migrations.RunPython(backfill_story_public_ids, clear_story_public_ids),
        migrations.AlterField(
            model_name='story',
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
