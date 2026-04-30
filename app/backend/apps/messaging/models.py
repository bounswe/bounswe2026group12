from django.db import models
from django.conf import settings
from django.utils import timezone


class Thread(models.Model):
    """
    A 1-to-1 conversation container between exactly two participants.

    ``last_message_at`` is denormalized and updated on every new Message
    so that the inbox list can be sorted cheaply without an aggregate query.
    ``last_message_preview`` stores a truncated snippet for inbox display.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_message_preview = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ['-last_message_at']

    def __str__(self):
        return f"Thread #{self.pk}"


class ThreadParticipant(models.Model):
    """
    Membership record linking a User to a Thread.

    ``last_read_at`` acts as the read-state cursor: any Message with
    ``created_at > last_read_at`` (and ``is_deleted=False``) is considered
    unread for this participant.
    """
    thread = models.ForeignKey(
        Thread, on_delete=models.CASCADE, related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='thread_participants',
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('thread', 'user')

    def __str__(self):
        return f"ThreadParticipant(thread={self.thread_id}, user={self.user_id})"


class Message(models.Model):
    """
    A single text message inside a Thread.

    Deletion is soft: ``is_deleted=True`` hides the body from recipients
    but preserves the record so conversation flow remains coherent.
    Only the original sender may soft-delete their own message.
    """
    thread = models.ForeignKey(
        Thread, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def soft_delete(self):
        """Mark this message as deleted without removing the DB row."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def __str__(self):
        return f"Message #{self.pk} in Thread #{self.thread_id}"
