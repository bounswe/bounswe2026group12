from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class HeritageGroup(models.Model):
    """A cultural lineage that bundles related Recipes and Stories.

    Heritage groups let curators tie together variants that share a
    cultural root (e.g. "Sarma / Dolma" linking Turkish, Greek, Levantine,
    and Balkan versions). Groups are the foundation HeritageJourneyStep
    (#511) and CulturalFact (#522) hang off of.
    """

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class HeritageGroupMembership(models.Model):
    """Generic FK row attaching a Recipe or Story to a HeritageGroup."""

    heritage_group = models.ForeignKey(
        HeritageGroup,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('heritage_group', 'content_type', 'object_id')
        ordering = ['heritage_group', '-created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return f'{self.heritage_group} -> {self.content_type} #{self.object_id}'


class HeritageJourneyStep(models.Model):
    """An ordered step in a HeritageGroup's cultural journey.

    Lets curators tell a multi-step story for a group, e.g. Köfte:
    Central Asia -> Anatolia -> Balkans -> Diaspora. Each step pins a
    location and a narrative, optionally tagged with an era. Step order
    is unique per group so timelines render deterministically.
    """

    heritage_group = models.ForeignKey(
        HeritageGroup,
        on_delete=models.CASCADE,
        related_name='journey_steps',
    )
    order = models.PositiveIntegerField()
    location = models.CharField(max_length=255)
    story = models.TextField()
    era = models.CharField(max_length=128, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['heritage_group', 'order']
        unique_together = ('heritage_group', 'order')

    def __str__(self):
        return f'{self.heritage_group} #{self.order} {self.location}'



class CulturalFact(models.Model):
    """A short cultural context fact surfaced as a "Did You Know?" card.

    A fact may be tied to a specific HeritageGroup (e.g. Sarma / Dolma),
    to a Region, to both, or to neither (general). Both FKs are nullable
    so curators can target any combination. The Region FK is declared as
    a string reference to avoid hard-coupling app import order.
    """

    heritage_group = models.ForeignKey(
        HeritageGroup,
        on_delete=models.CASCADE,
        related_name='cultural_facts',
        null=True,
        blank=True,
    )
    region = models.ForeignKey(
        'recipes.Region',
        on_delete=models.SET_NULL,
        related_name='cultural_facts',
        null=True,
        blank=True,
    )
    text = models.TextField()
    source_url = models.URLField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.text[:60]


class IngredientRoute(models.Model):
    """Chronological movement of an ingredient across the world (#506).

    Used for animated migration maps. Each route is tied to a specific
    Ingredient and contains a list of waypoints (location, era, coords).
    """

    ingredient = models.ForeignKey(
        'recipes.Ingredient',
        on_delete=models.CASCADE,
        related_name='migration_routes',
    )
    # waypoints: list of objects like [{"lat": 1.2, "lng": 3.4, "era": "1500s", "label": "Spain"}]
    waypoints = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ingredient']

    def __str__(self):
        return f"Migration route for {self.ingredient.name}"
