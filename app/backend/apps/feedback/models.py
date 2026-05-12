from django.db import models
from django.conf import settings

class Feedback(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='feedback_submissions'
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Light optional metadata so the team can triage in admin:
    user_agent = models.CharField(max_length=255, blank=True, default='')
    path = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Feedback'

    def __str__(self):
        return f"Feedback {self.id} by {self.user or 'Anonymous'}"

    @property
    def short_message(self):
        if len(self.message) > 50:
            return f"{self.message[:47]}..."
        return self.message
