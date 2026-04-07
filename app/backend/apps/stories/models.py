from django.db import models
from django.conf import settings
from apps.recipes.models import Recipe

class Story(models.Model):
    """Core Story model for sharing culinary narratives."""
    title = models.CharField(max_length=255)
    body = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stories')
    linked_recipe = models.ForeignKey(Recipe, on_delete=models.SET_NULL, null=True, blank=True, related_name='linked_stories')
    language = models.CharField(max_length=10, blank=True, default='en')
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
