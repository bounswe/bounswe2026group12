from django.db import models
from django.conf import settings
from django.db.models import Q

class Draft(models.Model):
    TARGET_STORY = 'story'
    TARGET_RECIPE = 'recipe'
    TARGET_TYPE_CHOICES = [
        (TARGET_STORY, 'Story'),
        (TARGET_RECIPE, 'Recipe'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='drafts'
    )
    target_type = models.CharField(
        max_length=50,
        choices=TARGET_TYPE_CHOICES,
        help_text="Type of entity (e.g., 'story', 'recipe')"
    )
    target_id = models.CharField(
        max_length=26,
        null=True,
        blank=True,
        help_text="public_id of the entity. Null for new creations."
    )
    data = models.JSONField(
        help_text="The serialized state of the editor/form."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'target_type', 'target_id'],
                name='unique_draft_existing',
                condition=Q(target_id__isnull=False)
            ),
            models.UniqueConstraint(
                fields=['user', 'target_type'],
                name='unique_draft_new',
                condition=Q(target_id__isnull=True)
            )
        ]
        ordering = ['-updated_at']

    def __str__(self):
        target = self.target_id or "new"
        return f"Draft for {self.target_type} ({target}) by {self.user.username}"
