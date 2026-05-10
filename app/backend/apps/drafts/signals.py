from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.stories.models import Story
from apps.recipes.models import Recipe
from .models import Draft

@receiver(post_save, sender=Story)
def delete_story_draft(sender, instance, **kwargs):
    """Delete draft when a story is saved/published."""
    Draft.objects.filter(
        user=instance.author,
        target_type='story',
        target_id=instance.public_id
    ).delete()
    # Also delete any "new story" draft since it's now created
    Draft.objects.filter(
        user=instance.author,
        target_type='story',
        target_id__isnull=True
    ).delete()

@receiver(post_save, sender=Recipe)
def delete_recipe_draft(sender, instance, **kwargs):
    """Delete draft when a recipe is saved/published."""
    Draft.objects.filter(
        user=instance.author,
        target_type='recipe',
        target_id=instance.public_id
    ).delete()
    # Also delete any "new recipe" draft
    Draft.objects.filter(
        user=instance.author,
        target_type='recipe',
        target_id__isnull=True
    ).delete()
