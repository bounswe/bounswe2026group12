"""Edit-enforcement regression tests for messaging app (#360, M6-09).

Audit coverage for requirement 4.4.1. Two surfaces are pinned here:

* Non-participant attempts to send / read on someone else's thread.
  ``ThreadViewSet.get_queryset`` already filters threads to the caller,
  so an outsider gets 404 from ``get_object()`` rather than 403. We
  accept either denial code as "blocked", and additionally assert no
  side effect (no new ``Message`` row, ``last_read_at`` unchanged).
* Non-sender attempts to delete someone else's message. ``MessageViewSet``
  has no queryset filter, so the explicit sender re-check inside
  ``destroy`` is load-bearing - this test pins both the 403 and the
  "row not soft-deleted" invariant.
"""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.messaging.models import Message, Thread, ThreadParticipant

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username, email=f'{username}@test.com', password='Pass123!',
    )


class ThreadParticipantEnforcementTests(APITestCase):
    def setUp(self):
        self.user1 = make_user('msg-u1')
        self.user2 = make_user('msg-u2')
        self.outsider = make_user('msg-outsider')

        self.thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=self.thread, user=self.user1)
        self.tp2 = ThreadParticipant.objects.create(
            thread=self.thread, user=self.user2,
        )

    def _denial_codes(self):
        # Outsider hits the participant queryset filter first (404), but
        # the explicit re-check inside the action would emit 403. Either
        # is an acceptable IDOR denial.
        return {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND}

    def test_non_participant_cannot_send_to_thread(self):
        """Audit coverage: outsider POST /api/threads/<id>/send/ does not
        create a Message and is denied."""
        original_count = self.thread.messages.count()
        self.client.force_authenticate(user=self.outsider)
        url = reverse('thread-send', args=[self.thread.id])
        response = self.client.post(url, {'body': 'Spoof'})
        self.assertIn(response.status_code, self._denial_codes())

        self.assertEqual(self.thread.messages.count(), original_count)

    def test_non_participant_cannot_mark_thread_read(self):
        """Audit coverage: outsider POST /api/threads/<id>/read/ does not
        advance any participant cursor and is denied."""
        before = self.tp2.last_read_at
        self.client.force_authenticate(user=self.outsider)
        url = reverse('thread-read', args=[self.thread.id])
        response = self.client.post(url)
        self.assertIn(response.status_code, self._denial_codes())

        self.tp2.refresh_from_db()
        self.assertEqual(self.tp2.last_read_at, before)


class MessageDeleteEnforcementTests(APITestCase):
    """Pin "row unchanged" for non-sender DELETE on a message.

    ``apps.messaging.tests::test_cannot_delete_others_message`` already
    asserts the 403 status. This test extends the same scenario with the
    ``row unchanged`` invariant required by the 4.4.1 audit pattern.
    """

    def setUp(self):
        self.sender = make_user('msg-sender')
        self.recipient = make_user('msg-recipient')

        self.thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=self.thread, user=self.sender)
        ThreadParticipant.objects.create(
            thread=self.thread, user=self.recipient,
        )
        self.message = Message.objects.create(
            thread=self.thread, sender=self.sender, body='Original body',
        )

    def test_non_sender_message_delete_does_not_mutate_row(self):
        """Audit coverage: non-sender DELETE /api/messages/<id>/ → 403, body
        and is_deleted unchanged."""
        self.client.force_authenticate(user=self.recipient)
        response = self.client.delete(reverse('message-detail', args=[self.message.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.message.refresh_from_db()
        self.assertEqual(self.message.body, 'Original body')
        self.assertFalse(self.message.is_deleted)
