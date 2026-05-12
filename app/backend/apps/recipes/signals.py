from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Rating, Recipe


def _refresh_recipe_rating_stats(recipe_id):
    stats = Rating.objects.filter(recipe_id=recipe_id).aggregate(
        average_rating=Avg('score'),
        rating_count=Count('id'),
    )
    Recipe.objects.filter(pk=recipe_id).update(
        average_rating=stats['average_rating'],
        rating_count=stats['rating_count'] or 0,
    )


@receiver(post_save, sender=Rating)
def sync_recipe_rating_on_save(sender, instance, **kwargs):
    _refresh_recipe_rating_stats(instance.recipe_id)


@receiver(post_delete, sender=Rating)
def sync_recipe_rating_on_delete(sender, instance, **kwargs):
    _refresh_recipe_rating_stats(instance.recipe_id)
