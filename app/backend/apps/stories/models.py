from django.db import models
from django.conf import settings
from apps.common.ids import generate_ulid, validate_ulid
from apps.recipes.models import Recipe, Region, DietaryTag, EventTag, Religion

class StoryRecipeLink(models.Model):
    """Through model linking a story to its recipes, with ordering."""
    story = models.ForeignKey('Story', on_delete=models.CASCADE, related_name='recipe_links')
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='story_links')
    order = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'recipe')
        ordering = ['order', 'added_at']

class Story(models.Model):
    """Core Story model for sharing culinary narratives.

    For map discovery (#381), a direct optional `region` FK is added so stories
    can be tagged independently of a linked recipe. If `region` is null but
    `linked_recipe` exists, the map API will fall back to the recipe's region.
    """
    public_id = models.CharField(
        max_length=26,
        unique=True,
        editable=False,
        default=generate_ulid,
        validators=[validate_ulid],
    )
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, default='')
    body = models.TextField()
    image = models.ImageField(upload_to='stories/images/', null=True, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stories')
    
    linked_recipes = models.ManyToManyField(
        Recipe, through='StoryRecipeLink',
        blank=True, related_name='linked_stories',
    )
    
    # Taxonomy tags (M5-20 / #386)
    dietary_tags = models.ManyToManyField(DietaryTag, blank=True, related_name='stories')
    event_tags = models.ManyToManyField(EventTag, blank=True, related_name='stories')
    religions = models.ManyToManyField(Religion, blank=True, related_name='stories')
    
    # Direct region tag for map discovery — falls back to linked_recipe.region in the API layer
    region = models.ForeignKey(
        Region, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stories',
        help_text='Geographic/cultural region for map discovery. Falls back to linked_recipe.region if null.',
    )
    language = models.CharField(max_length=10, blank=True, default='en')
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
