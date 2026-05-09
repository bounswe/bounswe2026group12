"""Edit-enforcement regression tests for stories app (#360, M6-09).

Audit coverage for requirement 4.4.1. Each test asserts a non-author is
denied with 403 and that the underlying Story row is unchanged. Pattern
follows TC_API_REC_002 in
``apps.recipes.tests_permissions::test_non_author_cannot_edit_recipe``.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.stories.models import Story

User = get_user_model()


class StoryEditEnforcementTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            email='story-author@example.com', username='story-author',
            password='pass12345',
        )
        self.other = User.objects.create_user(
            email='story-other@example.com', username='story-other',
            password='pass12345',
        )
        self.story = Story.objects.create(
            title='Author Story', body='Original body',
            author=self.author, is_published=True,
        )

    def test_non_author_cannot_patch_story(self):
        """Audit coverage: non-author PATCH /api/stories/<id>/ → 403, title unchanged."""
        original_title = self.story.title
        self.client.force_authenticate(user=self.other)
        response = self.client.patch(
            f'/api/stories/{self.story.id}/',
            {'title': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.story.refresh_from_db()
        self.assertEqual(self.story.title, original_title)

    def test_non_author_cannot_delete_story(self):
        """Audit coverage: non-author DELETE /api/stories/<id>/ → 403, row remains."""
        self.client.force_authenticate(user=self.other)
        response = self.client.delete(f'/api/stories/{self.story.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.assertTrue(Story.objects.filter(pk=self.story.pk).exists())

    def test_non_author_cannot_unpublish_story(self):
        """Audit coverage: non-author POST /api/stories/<id>/unpublish/ → 403,
        is_published unchanged."""
        self.client.force_authenticate(user=self.other)
        response = self.client.post(f'/api/stories/{self.story.id}/unpublish/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.story.refresh_from_db()
        self.assertTrue(self.story.is_published)
