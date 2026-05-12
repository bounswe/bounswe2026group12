# Zoom-to-region: per-recipe map coordinates (#662).
# Region map bounds reuse the existing Region.bbox_* fields (migration 0011),
# so no Region change is needed here.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0021_remove_secular_religion'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name='recipe',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]
