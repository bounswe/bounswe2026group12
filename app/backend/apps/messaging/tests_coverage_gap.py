"""Coverage-gap tests for the messaging app (#530).

Targets uncovered branches in views.py and models.py that the existing
suite does not exercise:

- thread creation error paths (missing other_user_id, user not found, self-thread)
- send action body validation (empty/missing body)
- delete on an already-soft-deleted message
- inbox ordering by last_message_at (most recent thread first)
- __str__ representations on Thread / ThreadParticipant / Message
"""
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Message, Thread, ThreadParticipant

User = get_user_model()


def _user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
    )


class ThreadCreateErrorPathTests(APITestCase):
    """Covers the 400 / 404 / 403 branches of ThreadViewSet.create."""

    def setUp(self):
        self.user1 = _user("u1")
        self.user2 = _user("u2")
        self.client.force_authenticate(user=self.user1)
        self.url = reverse('thread-list')

    def test_missing_other_user_id_returns_400(self):
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('other_user_id', res.data)

    def test_unknown_other_user_id_returns_404(self):
        res = self.client.post(self.url, {'other_user_id': 999999})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('other_user_id', res.data)

    def test_thread_with_self_returns_400(self):
        res = self.client.post(self.url, {'other_user_id': self.user1.id})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('other_user_id', res.data)


class SendValidationTests(APITestCase):
    """Covers the serializer-error branch of ThreadViewSet.send."""

    def setUp(self):
        self.user1 = _user("send1")
        self.user2 = _user("send2")
        self.thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=self.thread, user=self.user1)
        ThreadParticipant.objects.create(thread=self.thread, user=self.user2)
        self.client.force_authenticate(user=self.user1)

    def test_missing_body_returns_400(self):
        url = reverse('thread-send', args=[self.thread.id])
        res = self.client.post(url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('body', res.data)

    def test_empty_body_returns_400(self):
        url = reverse('thread-send', args=[self.thread.id])
        res = self.client.post(url, {'body': ''})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('body', res.data)


class MessageDeleteIdempotencyTests(APITestCase):
    """Covers the already-deleted branch of MessageViewSet.destroy."""

    def setUp(self):
        self.user1 = _user("del1")
        self.user2 = _user("del2")
        self.thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=self.thread, user=self.user1)
        ThreadParticipant.objects.create(thread=self.thread, user=self.user2)
        self.msg = Message.objects.create(
            thread=self.thread, sender=self.user1, body="hello",
        )

    def test_delete_already_deleted_message_returns_400(self):
        self.msg.soft_delete()
        self.client.force_authenticate(user=self.user1)
        url = reverse('message-detail', args=[self.msg.id])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', res.data)


class InboxOrderingTests(APITestCase):
    """Inbox lists threads ordered by last_message_at descending."""

    def setUp(self):
        self.me = _user("inbox-me")
        self.peer1 = _user("inbox-peer1")
        self.peer2 = _user("inbox-peer2")
        self.peer3 = _user("inbox-peer3")
        self.client.force_authenticate(user=self.me)

    def _make_thread(self, other, last_at):
        t = Thread.objects.create()
        ThreadParticipant.objects.create(thread=t, user=self.me)
        ThreadParticipant.objects.create(thread=t, user=other)
        Thread.objects.filter(pk=t.pk).update(last_message_at=last_at)
        return t

    def test_inbox_orders_most_recent_first(self):
        now = timezone.now()
        old = self._make_thread(self.peer1, now - timezone.timedelta(hours=2))
        newest = self._make_thread(self.peer2, now)
        middle = self._make_thread(self.peer3, now - timezone.timedelta(hours=1))

        res = self.client.get(reverse('thread-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [t['id'] for t in res.data]
        self.assertEqual(ids, [newest.id, middle.id, old.id])

    def test_inbox_excludes_threads_user_is_not_in(self):
        not_mine = Thread.objects.create()
        ThreadParticipant.objects.create(thread=not_mine, user=self.peer1)
        ThreadParticipant.objects.create(thread=not_mine, user=self.peer2)

        res = self.client.get(reverse('thread-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [t['id'] for t in res.data]
        self.assertNotIn(not_mine.id, ids)


class UnreadCountEdgeCaseTests(APITestCase):
    """Soft-deleted messages do not contribute to the unread count."""

    def setUp(self):
        self.me = _user("unread-me")
        self.peer = _user("unread-peer")
        self.thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=self.thread, user=self.me)
        ThreadParticipant.objects.create(thread=self.thread, user=self.peer)
        self.client.force_authenticate(user=self.me)

    def test_soft_deleted_message_does_not_count_as_unread(self):
        m1 = Message.objects.create(thread=self.thread, sender=self.peer, body="one")
        Message.objects.create(thread=self.thread, sender=self.peer, body="two")
        m1.soft_delete()

        res = self.client.get(reverse('thread-list'))
        self.assertEqual(res.data[0]['unread_count'], 1)


class ModelStringRepresentationTests(APITestCase):
    """Pin the __str__ output of messaging models so admin remains debuggable."""

    def test_thread_str(self):
        t = Thread.objects.create()
        self.assertEqual(str(t), f"Thread #{t.pk}")

    def test_thread_participant_str(self):
        u = _user("strp")
        t = Thread.objects.create()
        tp = ThreadParticipant.objects.create(thread=t, user=u)
        self.assertEqual(
            str(tp),
            f"ThreadParticipant(thread={t.pk}, user={u.pk})",
        )

    def test_message_str(self):
        u = _user("strm")
        t = Thread.objects.create()
        ThreadParticipant.objects.create(thread=t, user=u)
        m = Message.objects.create(thread=t, sender=u, body="hi")
        self.assertEqual(str(m), f"Message #{m.pk} in Thread #{t.pk}")
