from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from . import services
from .models import CulturalPassport


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_passport_for_new_user(sender, instance, created, **kwargs):
    """Ensure every new user has a cultural passport row (#583).

    Uses get_or_create so re-saving an existing user is a no-op and the
    backfill data migration stays idempotent.
    """
    if created:
        CulturalPassport.objects.get_or_create(user=instance)


@receiver(post_save, sender='recipes.Comment')
def award_point_for_comment(sender, instance, created, **kwargs):
    """Comment submitted -> +1 passport point (#587).

    Done as a signal so the diff stays inside apps/passport with no change to
    apps/recipes views. Recompute is idempotent, so re-saves are harmless.
    """
    if created:
        services.recalculate_passport_points(instance.author)


@receiver(post_save, sender='recipes.Recipe')
def award_for_heritage_recipe(sender, instance, created, **kwargs):
    """Heritage recipe shared -> +15 points + a heritage_shared timeline event
    and a heritage stamp for the recipe's culture (#587/#588).

    Fires only on creation of a recipe already flagged is_heritage; a later
    edit that flips the flag is not retro-credited (kept simple on purpose).
    """
    if created and instance.is_heritage:
        services.record_heritage_recipe_shared(instance)
