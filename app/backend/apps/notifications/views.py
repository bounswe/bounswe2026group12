from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import ListModelMixin
from .models import Notification, DeviceToken
from .serializers import NotificationSerializer, DeviceTokenSerializer


class NotificationViewSet(ListModelMixin, GenericViewSet):
    """
    List all notifications for the authenticated user.

    GET  /api/notifications/          — paginated list of the caller's notifications.
    POST /api/notifications/<id>/read/ — mark a specific notification as read.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('actor', 'recipe')

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'], url_path='read-all')
    def mark_all_read(self, request):
        """Mark all of the caller's unread notifications as read."""
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({'marked_read': updated})


class DeviceTokenView(APIView):
    """
    Register or update a device's Expo push token.

    POST /api/notifications/tokens/
    Body: { "token": "<ExponentPushToken[...]>" }

    If the token already exists (e.g. reinstall), the row is updated to the
    current user.  One user can have multiple tokens (multiple devices).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token_value = request.data.get('token', '').strip()
        if not token_value:
            return Response(
                {'token': 'This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj, created = DeviceToken.objects.update_or_create(
            token=token_value,
            defaults={'user': request.user},
        )
        serializer = DeviceTokenSerializer(obj)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)
