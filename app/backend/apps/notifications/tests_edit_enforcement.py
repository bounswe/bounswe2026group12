"""Edit-enforcement regression tests for notifications app (#360, M6-09).

Audit coverage for requirement 4.4.1. These pin two invariants:

* A non-recipient cannot mark someone else's notification as read.
  The viewset queryset filters to ``recipient=request.user``, so
  ``get_object()`` returns 404 for an outsider before the explicit
  ``recipient != request.user`` re-check fires. We accept either denial
  status as "blocked", and assert ``is_read`` did not flip on the
  victim's row.
* ``mark_all_read`` only touches the caller's notifications. The
  endpoint is scoped to ``recipient=request.user`` at the queryset
  level, so other users' unread notifications must remain unread after
  the call.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.recipes.models import Recipe

User = get_user_model()


class NotificationEditEnforcementTests(APITestCase):
    def setUp(self):
        self.recipient = User.objects.create_user(
            email='notif-recipient@example.com', username='notif-recipient',
            password='pass12345',
        )
        self.actor = User.objects.create_user(
            email='notif-actor@example.com', username='notif-actor',
            password='pass12345',
        )
        self.outsider = User.objects.create_user(
            email='notif-outsider@example.com', username='notif-outsider',
            password='pass12345',
        )
        self.recipe = Recipe.objects.create(
            title='N Recipe', description='Desc', author=self.recipient,
        )
        self.notification = Notification.objects.create(
            recipient=self.recipient, actor=self.actor, recipe=self.recipe,
            message='Hello', is_read=False,
        )
        self.outsider_notification = Notification.objects.create(
            recipient=self.outsider, actor=self.actor, recipe=self.recipe,
            message='Outsider unread', is_read=False,
        )

    def test_non_recipient_cannot_mark_notification_read(self):
        """Audit coverage: outsider POST /api/notifications/<id>/read/ → 4xx
        denial, ``is_read`` does not flip on the victim's row."""
        self.client.force_authenticate(user=self.outsider)
        response = self.client.post(
            f'/api/notifications/{self.notification.id}/read/'
        )
        self.assertIn(
            response.status_code,
            {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND},
        )

        self.notification.refresh_from_db()
        self.assertFalse(self.notification.is_read)

    def test_mark_all_read_does_not_touch_other_users_notifications(self):
        """Audit coverage: POST /api/notifications/read-all/ only flips the
        caller's notifications. Other users' unread rows stay unread."""
        self.client.force_authenticate(user=self.recipient)
        response = self.client.post('/api/notifications/read-all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.notification.refresh_from_db()
        self.outsider_notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        self.assertFalse(self.outsider_notification.is_read)
