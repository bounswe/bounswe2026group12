from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from apps.stories.models import Story
from apps.recipes.models import Recipe
from .models import Draft

User = get_user_model()

class DraftModelTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', username='testuser', password='password')

    def test_unique_draft_new_constraint(self):
        """A user can have only one 'new' draft per target_type."""
        Draft.objects.create(user=self.user, target_type='story', target_id=None, data={'title': 'D1'})
        with self.assertRaises(IntegrityError):
            Draft.objects.create(user=self.user, target_type='story', target_id=None, data={'title': 'D2'})

    def test_unique_draft_existing_constraint(self):
        """A user can have only one draft per existing entity."""
        Draft.objects.create(user=self.user, target_type='story', target_id='ID1', data={'title': 'D1'})
        with self.assertRaises(IntegrityError):
            Draft.objects.create(user=self.user, target_type='story', target_id='ID1', data={'title': 'D2'})
        
        # Different target_id should be fine
        Draft.objects.create(user=self.user, target_type='story', target_id='ID2', data={'title': 'D3'})


class DraftAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='api@example.com', username='apiuser', password='password')
        self.client.force_authenticate(user=self.user)
        self.url = reverse('draft-list')

    def test_create_new_draft(self):
        data = {
            "target_type": "story",
            "data": {"title": "New Story Draft"}
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Draft.objects.count(), 1)
        self.assertEqual(Draft.objects.first().target_id, None)

    def test_upsert_draft(self):
        # Create initial
        self.client.post(self.url, {"target_type": "story", "data": {"title": "V1"}}, format='json')
        
        # Update via same POST endpoint
        response = self.client.post(self.url, {"target_type": "story", "data": {"title": "V2"}}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Draft.objects.count(), 1)
        self.assertEqual(Draft.objects.first().data['title'], "V2")

    def test_list_drafts_only_own(self):
        other_user = User.objects.create_user(email='other@example.com', username='other', password='password')
        Draft.objects.create(user=self.user, target_type='story', data={})
        Draft.objects.create(user=other_user, target_type='story', data={})
        
        response = self.client.get(self.url)
        # Assuming no pagination for this test or handling it
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)

    def test_delete_draft(self):
        draft = Draft.objects.create(user=self.user, target_type='story', data={})
        url = reverse('draft-detail', kwargs={'pk': draft.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Draft.objects.count(), 0)


class DraftSignalTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='signal@example.com', username='signaluser', password='password')

    def test_story_creation_cleans_draft(self):
        Draft.objects.create(user=self.user, target_type='story', target_id=None, data={})
        self.assertEqual(Draft.objects.count(), 1)
        
        Story.objects.create(title="S1", body="B1", author=self.user)
        self.assertEqual(Draft.objects.count(), 0)

    def test_story_update_cleans_draft(self):
        story = Story.objects.create(title="S1", body="B1", author=self.user)
        Draft.objects.create(user=self.user, target_type='story', target_id=story.public_id, data={})
        self.assertEqual(Draft.objects.count(), 1)
        
        story.title = "Updated"
        story.save()
        self.assertEqual(Draft.objects.count(), 0)

    def test_recipe_cleanup(self):
        Draft.objects.create(user=self.user, target_type='recipe', target_id=None, data={})
        Recipe.objects.create(title="R1", description="D1", author=self.user)
        self.assertEqual(Draft.objects.count(), 0)
