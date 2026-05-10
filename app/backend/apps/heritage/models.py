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
