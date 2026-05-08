from django.db import models
from django.conf import settings
from apps.recipes.models import Recipe, Region

class Story(models.Model):
    """Core Story model for sharing culinary narratives.

    For map discovery (#381), a direct optional `region` FK is added so stories
    can be tagged independently of a linked recipe. If `region` is null but
    `linked_recipe` exists, the map API will fall back to the recipe's region.
    """
    title = models.CharField(max_length=255)
    body = models.TextField()
    image = models.ImageField(upload_to='stories/images/', null=True, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stories')
    linked_recipe = models.ForeignKey(Recipe, on_delete=models.SET_NULL, null=True, blank=True, related_name='linked_stories')
    # Direct region tag for map discovery — falls back to linked_recipe.region in the API layer
    region = models.ForeignKey(
        Region, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stories',
        help_text='Geographic/cultural region for map discovery. Falls back to linked_recipe.region if null.',
    )
    language = models.CharField(max_length=10, blank=True, default='en')
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
