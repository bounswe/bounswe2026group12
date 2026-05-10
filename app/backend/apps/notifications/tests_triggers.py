"""Coverage-gap tests for the notifications app (#530).

Targets uncovered branches in views.py and signals.py:

- NotificationViewSet.mark_read: success path + cross-user 403
- NotificationViewSet.mark_all_read: bulk update behavior
- DeviceTokenView.post: create vs. re-claim, empty body validation
- signals._send_expo_push: invocation path when DeviceTokens exist
- model __str__ representations for Notification / DeviceToken
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import DeviceToken, Notification
from apps.recipes.models import Comment, Recipe, Region

User = get_user_model()


def _user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
    )


def _recipe(author):
    return Recipe.objects.create(
        title=f"{author.username}'s recipe",
        description="desc",
        author=author,
        region=Region.objects.first(),
        qa_enabled=True,
        is_published=True,
    )


class MarkReadActionTests(APITestCase):
    """POST /api/notifications/<id>/read/ — single notification flag."""

    def setUp(self):
        self.alice = _user("notif-alice")
        self.bob = _user("notif-bob")
        self.recipe = _recipe(self.alice)
        # Triggering a question by Bob creates a Notification for Alice
        Comment.objects.create(
            recipe=self.recipe,
            author=self.bob,
            body="how long?",
            type="QUESTION",
        )
        self.notif = Notification.objects.get(recipient=self.alice)

    def test_recipient_can_mark_own_notification_read(self):
        self.client.force_authenticate(user=self.alice)
        url = reverse('notification-mark-read', args=[self.notif.id])
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_read'])
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)

    def test_cross_user_cannot_see_notification(self):
        """A different user's notification is not in their queryset (404)."""
        self.client.force_authenticate(user=self.bob)
        url = reverse('notification-mark-read', args=[self.notif.id])
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.notif.refresh_from_db()
        self.assertFalse(self.notif.is_read)


class MarkAllReadActionTests(APITestCase):
    """POST /api/notifications/read-all/ — bulk mark."""

    def setUp(self):
        self.alice = _user("readall-alice")
        self.bob = _user("readall-bob")
        self.recipe = _recipe(self.alice)

    def test_marks_only_unread_owned_notifications(self):
        # Two unread notifications for Alice
        Comment.objects.create(
            recipe=self.recipe, author=self.bob, body="q1", type="QUESTION",
        )
        Comment.objects.create(
            recipe=self.recipe, author=self.bob, body="q2", type="QUESTION",
        )
        # An unrelated notification for Bob should remain untouched
        other_recipe = _recipe(self.bob)
        Comment.objects.create(
            recipe=other_recipe, author=self.alice, body="q3", type="QUESTION",
        )

        self.client.force_authenticate(user=self.alice)
        url = reverse('notification-mark-all-read')
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['marked_read'], 2)

        # Bob's notification still unread
        self.assertFalse(Notification.objects.get(recipient=self.bob).is_read)
        # All of Alice's notifications are read
        self.assertEqual(
            Notification.objects.filter(recipient=self.alice, is_read=False).count(),
            0,
        )

    def test_returns_zero_when_no_unread(self):
        self.client.force_authenticate(user=self.alice)
        url = reverse('notification-mark-all-read')
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['marked_read'], 0)


class DeviceTokenViewTests(APITestCase):
    """POST /api/notifications/tokens/ — register / re-claim Expo tokens."""

    def setUp(self):
        self.alice = _user("dev-alice")
        self.bob = _user("dev-bob")
        self.url = reverse('device-token')

    def test_create_returns_201(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.post(self.url, {'token': 'ExponentPushToken[ABC]'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['token'], 'ExponentPushToken[ABC]')
        self.assertTrue(
            DeviceToken.objects.filter(
                token='ExponentPushToken[ABC]', user=self.alice,
            ).exists(),
        )

    def test_reclaim_existing_token_returns_200(self):
        DeviceToken.objects.create(user=self.bob, token='ExponentPushToken[REUSE]')
        self.client.force_authenticate(user=self.alice)
        res = self.client.post(self.url, {'token': 'ExponentPushToken[REUSE]'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Token row was rebound to alice (only one row per token)
        token = DeviceToken.objects.get(token='ExponentPushToken[REUSE]')
        self.assertEqual(token.user, self.alice)

    def test_missing_token_returns_400(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('token', res.data)

    def test_whitespace_only_token_returns_400(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.post(self.url, {'token': '   '})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('token', res.data)

    def test_anonymous_rejected(self):
        res = self.client.post(self.url, {'token': 'ExponentPushToken[X]'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class PushNotificationHelperTests(TestCase):
    """signals._send_expo_push is invoked when the recipient has tokens.

    We patch it to confirm the dispatch happens — the real Expo SDK call is
    mocked out so we don't depend on network or the SDK at test time.
    """

    def setUp(self):
        self.author = _user("push-author")
        self.questioner = _user("push-questioner")
        self.recipe = _recipe(self.author)

    def test_send_push_called_on_question_when_author_has_token(self):
        DeviceToken.objects.create(
            user=self.author, token='ExponentPushToken[AUTHOR]',
        )
        with mock.patch('apps.notifications.signals._send_expo_push') as send:
            Comment.objects.create(
                recipe=self.recipe,
                author=self.questioner,
                body="any tips?",
                type="QUESTION",
            )
        send.assert_called_once()
        args, kwargs = send.call_args
        self.assertEqual(kwargs['tokens'], ['ExponentPushToken[AUTHOR]'])
        self.assertIn(self.recipe.title, kwargs['body'])

    def test_send_push_called_on_reply_when_asker_has_token(self):
        question = Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="?",
            type="QUESTION",
        )
        DeviceToken.objects.create(
            user=self.questioner, token='ExponentPushToken[ASKER]',
        )
        replier = _user("push-replier")
        with mock.patch('apps.notifications.signals._send_expo_push') as send:
            Comment.objects.create(
                recipe=self.recipe,
                author=replier,
                parent_comment=question,
                body="here you go",
                type="COMMENT",
            )
        send.assert_called_once()
        _, kwargs = send.call_args
        self.assertEqual(kwargs['tokens'], ['ExponentPushToken[ASKER]'])

    def test_send_push_skipped_when_recipient_has_no_token(self):
        with mock.patch('apps.notifications.signals._send_expo_push') as send:
            Comment.objects.create(
                recipe=self.recipe,
                author=self.questioner,
                body="any tips?",
                type="QUESTION",
            )
        send.assert_not_called()

    def test_send_expo_push_no_ops_when_sdk_missing(self):
        """If exponent_server_sdk import fails, the helper returns without raising."""
        from apps.notifications import signals

        # Force ImportError on the SDK import inside the helper
        import builtins
        real_import = builtins.__import__

        def fake_import(name, *args, **kwargs):
            if name == 'exponent_server_sdk':
                raise ImportError("simulated missing SDK")
            return real_import(name, *args, **kwargs)

        with mock.patch.object(builtins, '__import__', side_effect=fake_import):
            # Should return cleanly, no exception
            signals._send_expo_push(['ExponentPushToken[X]'], 'title', 'body')


class NotificationModelStrTests(TestCase):
    """Pin __str__ output for Notification and DeviceToken."""

    def test_notification_str(self):
        alice = _user("nstr-alice")
        bob = _user("nstr-bob")
        recipe = _recipe(alice)
        n = Notification.objects.create(
            recipient=alice, actor=bob, recipe=recipe, message="hi there",
        )
        self.assertIn(alice.username, str(n))
        self.assertIn("hi there", str(n))

    def test_device_token_str(self):
        alice = _user("tstr-alice")
        token_value = 'ExponentPushToken[1234567890ABCDEFGHIJ]'
        t = DeviceToken.objects.create(user=alice, token=token_value)
        s = str(t)
        self.assertIn(alice.username, s)
        # Truncated to 30 chars per __str__
        self.assertIn(token_value[:30], s)
