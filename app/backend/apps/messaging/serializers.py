from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Message, Thread, ThreadParticipant

User = get_user_model()

DELETED_BODY_PLACEHOLDER = "[deleted]"


class MessageWriteSerializer(serializers.ModelSerializer):
    """Used only for write (send) operations — accepts body only."""

    class Meta:
        model = Message
        fields = ['body']


class MessageSerializer(serializers.ModelSerializer):
    """
    Read serializer for Message objects.

    When ``is_deleted`` is True the body is replaced with a placeholder so
    that the conversation flow remains coherent without leaking content.
    """
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_display_name = serializers.ReadOnlyField(source='sender.display_name')
    sender_avatar_url = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'thread', 'sender', 'sender_username', 'sender_display_name', 'sender_avatar_url',
            'body', 'created_at', 'is_deleted', 'deleted_at',
        ]
        read_only_fields = ['thread', 'sender', 'created_at', 'is_deleted', 'deleted_at']

    def get_body(self, obj):
        if obj.is_deleted:
            return DELETED_BODY_PLACEHOLDER
        return obj.body

    def get_sender_avatar_url(self, obj):
        if not obj.sender or not obj.sender.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.sender.avatar.url)
        return obj.sender.avatar.url


class ThreadSerializer(serializers.ModelSerializer):
    """
    Inbox-level representation of a Thread.

    Computes ``other_user_id``, ``other_username``, and ``unread_count``
    for the requesting user.  Full message list is fetched via the
    ``/threads/<id>/messages/`` action.
    """
    other_user_id = serializers.SerializerMethodField()
    other_username = serializers.SerializerMethodField()
    other_display_name = serializers.SerializerMethodField()
    other_avatar_url = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = [
            'id',
            'other_user_id',
            'other_username',
            'other_display_name',
            'other_avatar_url',
            'last_message_at',
            'last_message_preview',
            'unread_count',
            'created_at',
        ]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _other_participant(self, obj):
        request = self.context['request']
        return (
            obj.participants
            .exclude(user=request.user)
            .select_related('user')
            .first()
        )

    # ------------------------------------------------------------------
    # Field methods
    # ------------------------------------------------------------------

    def get_other_user_id(self, obj):
        p = self._other_participant(obj)
        return p.user_id if p else None

    def get_other_username(self, obj):
        p = self._other_participant(obj)
        return p.user.username if p else None

    def get_other_display_name(self, obj):
        p = self._other_participant(obj)
        return p.user.display_name if p else None

    def get_other_avatar_url(self, obj):
        p = self._other_participant(obj)
        if not p or not p.user.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(p.user.avatar.url)
        return p.user.avatar.url

    def get_unread_count(self, obj):
        request = self.context['request']
        me = obj.participants.filter(user=request.user).first()
        if not me:
            return 0
        # Only non-deleted messages count as unread
        qs = obj.messages.filter(is_deleted=False)
        if me.last_read_at is None:
            return qs.count()
        return qs.filter(created_at__gt=me.last_read_at).count()
