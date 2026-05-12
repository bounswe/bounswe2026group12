from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0021_remove_secular_religion'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='steps',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
