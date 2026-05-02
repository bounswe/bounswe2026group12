from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Message, Thread, ThreadParticipant

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
    )


class MessagingTests(APITestCase):
    def setUp(self):
        self.user1 = make_user("user1")
        self.user2 = make_user("user2")
        self.user3 = make_user("user3")

    def test_create_thread_idempotency(self):
        """Creating a thread between same users returns the existing one."""
        self.client.force_authenticate(user=self.user1)
        url = reverse('thread-list')
        data = {'other_user_id': self.user2.id}

        # First call creates
        res1 = self.client.post(url, data)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        thread_id = res1.data['id']

        # Second call returns existing
        res2 = self.client.post(url, data)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['id'], thread_id)

    def test_send_message_updates_inbox_index(self):
        """Sending a message updates last_message_at and preview."""
        self.client.force_authenticate(user=self.user1)
        thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=thread, user=self.user1)
        ThreadParticipant.objects.create(thread=thread, user=self.user2)

        url = reverse('thread-send', args=[thread.id])
        body = "Hello User 2"
        res = self.client.post(url, {'body': body})

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        thread.refresh_from_db()
        self.assertEqual(thread.last_message_preview, body)
        self.assertIsNotNone(thread.last_message_at)

    def test_unread_count_calculation(self):
        """Unread count correctly identifies messages after last_read_at."""
        self.client.force_authenticate(user=self.user1)
        thread = Thread.objects.create()
        tp1 = ThreadParticipant.objects.create(thread=thread, user=self.user1)
        ThreadParticipant.objects.create(thread=thread, user=self.user2)

        # Send 2 messages from user2
        Message.objects.create(thread=thread, sender=self.user2, body="Msg 1")
        Message.objects.create(thread=thread, sender=self.user2, body="Msg 2")

        # Check inbox
        url = reverse('thread-list')
        res = self.client.get(url)
        self.assertEqual(res.data[0]['unread_count'], 2)

        # Mark as read
        self.client.post(reverse('thread-read', args=[thread.id]))
        res = self.client.get(url)
        self.assertEqual(res.data[0]['unread_count'], 0)

    def test_soft_delete_body_masking(self):
        """Deleting a message replaces body with [deleted] for all users."""
        thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=thread, user=self.user1)
        ThreadParticipant.objects.create(thread=thread, user=self.user2)
        msg = Message.objects.create(thread=thread, sender=self.user1, body="Secret")

        # User1 deletes
        self.client.force_authenticate(user=self.user1)
        res = self.client.delete(reverse('message-detail', args=[msg.id]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['body'], "[deleted]")

        # User2 sees deleted
        self.client.force_authenticate(user=self.user2)
        res = self.client.get(reverse('thread-messages', args=[thread.id]))
        self.assertEqual(res.data[0]['body'], "[deleted]")

    def test_cannot_delete_others_message(self):
        """User cannot delete a message they didn't send."""
        thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=thread, user=self.user1)
        ThreadParticipant.objects.create(thread=thread, user=self.user2)
        msg = Message.objects.create(thread=thread, sender=self.user1, body="Safe")

        self.client.force_authenticate(user=self.user2)
        res = self.client.delete(reverse('message-detail', args=[msg.id]))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_start_thread_with_uncontactable_user(self):
        """Users cannot open new threads with someone who disabled contactability."""
        self.user2.is_contactable = False
        self.user2.save()

        self.client.force_authenticate(user=self.user1)
        url = reverse('thread-list')
        data = {'other_user_id': self.user2.id}

        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('disabled', res.data['detail'])

    def test_existing_thread_works_even_if_uncontactable(self):
        """
        Contactability only blocks *new* threads.
        Existing threads should still allow sending messages.
        """
        # 1. Create thread while contactable
        thread = Thread.objects.create()
        ThreadParticipant.objects.create(thread=thread, user=self.user1)
        ThreadParticipant.objects.create(thread=thread, user=self.user2)

        # 2. User2 disables contactability
        self.user2.is_contactable = False
        self.user2.save()

        # 3. User1 should still be able to send a message
        self.client.force_authenticate(user=self.user1)
        url = reverse('thread-send', args=[thread.id])
        res = self.client.post(url, {'body': "Still here?"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
