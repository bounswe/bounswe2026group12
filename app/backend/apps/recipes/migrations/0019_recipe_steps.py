from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0018_ingredient_unit_dietary_tag_audit_fields_361'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='steps',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
