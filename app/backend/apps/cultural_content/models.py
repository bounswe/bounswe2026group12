from django.db import models
from apps.recipes.models import Recipe, Region


class CulturalContent(models.Model):
    """Daily cultural content card (M4-17 / #348).

    `region` was originally a plain CharField. For map discovery (#381), it is
    now a nullable FK to Region so cultural content can participate in
    bounding-box queries.  The original free-text value is preserved in
    `region_text` so no data is lost for rows that don't match a Region record.
    """

    class Kind(models.TextChoices):
        TRADITION = 'tradition', 'Tradition'
        DISH = 'dish', 'Dish'
        STORY = 'story', 'Story'
        FACT = 'fact', 'Fact'
        HOLIDAY = 'holiday', 'Holiday'

    class LinkKind(models.TextChoices):
        RECIPE = 'recipe', 'Recipe'
        STORY = 'story', 'Story'

    slug = models.SlugField(max_length=100, unique=True)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    title = models.CharField(max_length=200)
    body = models.TextField()

    # FK region for map discovery — supersedes the old free-text field
    region = models.ForeignKey(
        Region, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cultural_content',
        help_text='Structured region FK for map-discovery queries.',
    )
    # Preserved from the original CharField; populated by the data migration
    # for any legacy value that did not match an existing Region name.
    region_text = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Original free-text region value (legacy / fallback).',
    )

    link_kind = models.CharField(max_length=20, choices=LinkKind.choices, blank=True, default='')
    link_id = models.PositiveIntegerField(null=True, blank=True)
    cultural_tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.kind}] {self.title}'


class CulturalEvent(models.Model):
    """Cultural event tied to a date rule and a region (#528).

    `date_rule` stores the raw rule string so the frontend can resolve
    lunar dates against its own reference table. Two formats are supported:

    - ``fixed:MM-DD`` for Gregorian-anchored events (e.g. ``fixed:03-21``
      for Nevruz). Month filter (`?month=03`) does a string-prefix match.
    - ``lunar:<name>`` for lunar-anchored events (e.g. ``lunar:ramadan``).
      These are not resolved on the backend; the month filter includes
      every lunar rule alongside the matching fixed rules so curators can
      surface them in seasonal listings.
    """
    name = models.CharField(max_length=255)
    date_rule = models.CharField(
        max_length=64,
        help_text=(
            'Rule string for when the event falls. Supported formats: '
            '"fixed:MM-DD" (Gregorian, e.g. "fixed:03-21") or '
            '"lunar:<name>" (lunar-anchored, e.g. "lunar:ramadan"). '
            'Lunar rules are resolved on the frontend.'
        ),
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cultural_events',
    )
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CulturalEventRecipe(models.Model):
    """Junction between CulturalEvent and Recipe (#528)."""
    event = models.ForeignKey(
        CulturalEvent,
        on_delete=models.CASCADE,
        related_name='event_recipes',
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name='cultural_event_links',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'recipe')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event.name} <-> {self.recipe.title}'
