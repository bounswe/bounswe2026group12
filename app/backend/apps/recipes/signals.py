"""Signals that keep Recipe's denormalised rating stats in sync (#734).

Wired in RecipesConfig.ready(); not connected at module import time.
"""
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Rating, Recipe


def recompute_recipe_rating(recipe_id):
    """Recompute average_rating (2 dp, null when no ratings) and rating_count."""
    stats = Rating.objects.filter(recipe_id=recipe_id).aggregate(
        average=Avg('score'), count=Count('id'),
    )
    count = stats['count'] or 0
    average = stats['average']
    if average is not None:
        average = Decimal(str(average)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    Recipe.objects.filter(pk=recipe_id).update(average_rating=average, rating_count=count)


@receiver(post_save, sender=Rating)
def update_recipe_rating_on_save(sender, instance, **kwargs):
    recompute_recipe_rating(instance.recipe_id)


@receiver(post_delete, sender=Rating)
def update_recipe_rating_on_delete(sender, instance, **kwargs):
    recompute_recipe_rating(instance.recipe_id)
