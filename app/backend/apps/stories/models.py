from django.contrib.contenttypes.fields import GenericRelation
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

    class StoryType(models.TextChoices):
        TRADITIONAL = "traditional", "Traditional"
        HISTORICAL = "historical", "Historical"
        FAMILY = "family", "Family"
        FESTIVE = "festive", "Festive"
        PERSONAL = "personal", "Personal"

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
    # Optional per-story map coordinates (#730). Mirrors Recipe.latitude/longitude.
    # Independent of region and linked_recipes; a story may have coordinates with
    # or without either. Stories without coordinates remain valid.
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    language = models.CharField(max_length=10, blank=True, default='en')
    story_type = models.CharField(
        max_length=20,
        choices=StoryType.choices,
        blank=True,
        null=True,
    )
    is_published = models.BooleanField(default=False)
    # Reverse generic relation to HeritageGroupMembership (#499). Virtual
    # field; no extra column on Story. Used for prefetch and serializer
    # lookup of the story's heritage group.
    heritage_memberships = GenericRelation(
        'heritage.HeritageGroupMembership',
        related_query_name='story',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class StoryComment(models.Model):
    """Comment or Question on a Story, mirroring apps.recipes.models.Comment."""
    COMMENT_TYPES = (
        ('COMMENT', 'Comment'),
        ('QUESTION', 'Question'),
    )

    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='story_comments'
    )
    parent_comment = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies'
    )
    body = models.TextField()
    type = models.CharField(max_length=10, choices=COMMENT_TYPES, default='COMMENT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_type_display()} by {self.author.username} on {self.story.title}"


class StoryVote(models.Model):
    """Vote on a StoryComment indicating it was helpful."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='story_votes'
    )
    comment = models.ForeignKey(StoryComment, on_delete=models.CASCADE, related_name='votes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'comment')

    def __str__(self):
        return f"Vote by {self.user.username} on StoryComment {self.comment.id}"
