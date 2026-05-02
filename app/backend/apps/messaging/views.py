from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Message, Thread, ThreadParticipant
from .serializers import MessageSerializer, MessageWriteSerializer, ThreadSerializer

User = get_user_model()


class ThreadViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Manages conversation threads for the authenticated user.

    List / Create
    -------------
    GET  /api/threads/         — inbox: all threads the caller belongs to,
                                 ordered by most recent message first.
    POST /api/threads/         — create or retrieve a thread with another user
                                 (idempotent; returns 200 if thread already exists,
                                 201 on creation).
                                 Body: { "other_user_id": <id> }

    Detail
    ------
    GET  /api/threads/<id>/    — thread metadata (no message list).

    Actions
    -------
    POST /api/threads/<id>/send/      — send a message to the thread.
    GET  /api/threads/<id>/messages/  — list messages with cursor paging.
    POST /api/threads/<id>/read/      — advance the caller's read cursor to now.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ThreadSerializer

    # ------------------------------------------------------------------
    # Queryset
    # ------------------------------------------------------------------

    def get_queryset(self):
        """Inbox: threads the caller participates in, newest-first."""
        return (
            Thread.objects
            .filter(participants__user=self.request.user)
            .prefetch_related('participants__user')
            .order_by('-last_message_at')
        )

    # ------------------------------------------------------------------
    # Create (idempotent)
    # ------------------------------------------------------------------

    def create(self, request, *args, **kwargs):
        """
        POST /api/threads/  { "other_user_id": <id> }

        Returns 200 with the existing thread if one already exists between
        the two users, or 201 when a new thread is created.
        """
        other_id = request.data.get('other_user_id')
        if not other_id:
            return Response(
                {'other_user_id': 'This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            other = User.objects.get(pk=other_id)
        except User.DoesNotExist:
            return Response(
                {'other_user_id': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if other == request.user:
            return Response(
                {'other_user_id': 'You cannot start a thread with yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not other.is_contactable:
            return Response(
                {'detail': 'This user has disabled new message threads.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find an existing 1-to-1 thread shared by both users
        existing = (
            Thread.objects
            .filter(participants__user=request.user)
            .filter(participants__user=other)
            .first()
        )
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Create a new thread + two participant rows
        thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=thread, user=request.user)
        ThreadParticipant.objects.create(thread=thread, user=other)

        serializer = self.get_serializer(thread)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # Send
    # ------------------------------------------------------------------

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """
        POST /api/threads/<id>/send/  { "body": "..." }

        Sends a message and updates the thread's inbox index fields.
        The sender's read cursor is automatically advanced so their own
        message does not count as unread for themselves.
        """
        thread = self.get_object()
        if not thread.participants.filter(user=request.user).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = MessageWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        message = serializer.save(thread=thread, sender=request.user)

        # Denormalize the inbox index in a single UPDATE (avoids a re-fetch)
        Thread.objects.filter(pk=thread.pk).update(
            last_message_at=message.created_at,
            last_message_preview=message.body[:120],
        )
        # Auto-advance the sender's own read cursor
        ThreadParticipant.objects.filter(
            thread=thread, user=request.user
        ).update(last_read_at=message.created_at)

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # Messages (cursor-paginated)
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """
        GET /api/threads/<id>/messages/?cursor=<ISO-8601 datetime>

        Returns messages in chronological order.  Pass ``cursor`` to fetch
        only messages created after that timestamp (forward-only paging).
        All messages are returned (including soft-deleted ones with a masked
        body) so conversation flow remains intact.
        """
        thread = self.get_object()
        if not thread.participants.filter(user=request.user).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)

        qs = thread.messages.select_related('sender').order_by('created_at')

        cursor = request.query_params.get('cursor')
        if cursor:
            try:
                qs = qs.filter(created_at__gt=cursor)
            except (ValueError, TypeError):
                return Response(
                    {'cursor': 'Invalid datetime format.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MessageSerializer(page, many=True).data)
        return Response(MessageSerializer(qs, many=True).data)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """
        POST /api/threads/<id>/read/

        Advances the caller's ``last_read_at`` cursor to the current time,
        clearing the unread count for this thread.
        """
        thread = self.get_object()
        updated = ThreadParticipant.objects.filter(
            thread=thread, user=request.user
        ).update(last_read_at=timezone.now())
        if not updated:
            return Response(status=status.HTTP_403_FORBIDDEN)
        return Response({'status': 'read'})


class MessageViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    Soft-deletes a message (sender only).

    DELETE /api/messages/<id>/

    The message row is retained so conversation continuity is preserved.
    The body is replaced with ``[deleted]`` in all subsequent reads.
    Returns 200 with the updated message object (not 204) so callers can
    refresh their UI state without a separate fetch.
    """

    queryset = Message.objects.select_related('sender', 'thread')
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender != request.user:
            return Response(
                {'detail': 'You can only delete your own messages.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.is_deleted:
            return Response(
                {'detail': 'Message is already deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message.soft_delete()
        return Response(MessageSerializer(message).data, status=status.HTTP_200_OK)
