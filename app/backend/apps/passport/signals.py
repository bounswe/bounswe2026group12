from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CulturalPassport


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_passport_for_new_user(sender, instance, created, **kwargs):
    """Ensure every new user has a cultural passport row (#583).

    Uses get_or_create so re-saving an existing user is a no-op and the
    backfill data migration stays idempotent.
    """
    if created:
        CulturalPassport.objects.get_or_create(user=instance)
