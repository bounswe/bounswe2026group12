from django.db import models


class CulturalContent(models.Model):
    """Daily cultural content card (M4-17 / #348)."""

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
    region = models.CharField(max_length=100, blank=True, default='')
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
