from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

User = get_user_model()


class StoryCreateAPITest(APITestCase):
    """Tests for POST /api/stories/ (#177)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="author@example.com", username="author", password="Pass123!"
        )
        self.region = Region.objects.create(name="Turkish")
        self.recipe = Recipe.objects.create(
            title="Baklava", description="Sweet pastry",
            region=self.region, author=self.user, is_published=True
        )
        self.url = reverse('story-list')

    def test_create_story_success(self):
        self.client.force_authenticate(user=self.user)
        data = {"title": "My Story", "body": "A great culinary journey", "summary": "Short intro"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "My Story")
        self.assertEqual(response.data['summary'], "Short intro")
        self.assertEqual(response.data['author_username'], "author")

    def test_create_story_with_linked_recipe_legacy(self):
        """Test backward compatibility: sending 'linked_recipe' as single ID."""
        self.client.force_authenticate(user=self.user)
        data = {
            "title": "Baklava Story",
            "body": "How I learned to make baklava",
            "linked_recipe": self.recipe.id
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['linked_recipe'], self.recipe.id)
        self.assertEqual(response.data['recipe_title'], "Baklava")
        self.assertEqual(len(response.data['linked_recipes']), 1)
        self.assertEqual(response.data['linked_recipes'][0]['recipe_id'], self.recipe.id)

    def test_create_story_with_multiple_recipes(self):
        """Test new capability: sending 'linked_recipe_ids' as array."""
        self.client.force_authenticate(user=self.user)
        recipe2 = Recipe.objects.create(
            title="Kunefe", description="Cheese pastry",
            region=self.region, author=self.user, is_published=True
        )
        data = {
            "title": "Sweet Journey",
            "body": "Baklava and Kunefe",
            "linked_recipe_ids": [self.recipe.id, recipe2.id]
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # linked_recipe (singular) should return the first one
        self.assertEqual(response.data['linked_recipe'], self.recipe.id)
        # linked_recipes (array) should return both
        self.assertEqual(len(response.data['linked_recipes']), 2)
        ids = [r['recipe_id'] for r in response.data['linked_recipes']]
        self.assertEqual(ids, [self.recipe.id, recipe2.id])

    def test_create_story_without_linked_recipe(self):
        self.client.force_authenticate(user=self.user)
        data = {"title": "Solo Story", "body": "No recipe linked"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['linked_recipe'])
        self.assertEqual(len(response.data['linked_recipes']), 0)

    def test_create_story_missing_title(self):
        self.client.force_authenticate(user=self.user)
        data = {"body": "No title here"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_create_story_missing_body(self):
        self.client.force_authenticate(user=self.user)
        data = {"title": "No body"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('body', response.data)

    def test_create_story_unauthenticated(self):
        data = {"title": "Anon Story", "body": "Should fail"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_story_with_language(self):
        self.client.force_authenticate(user=self.user)
        data = {"title": "Türk Hikayesi", "body": "Türkçe içerik", "language": "tr"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['language'], "tr")

    def test_create_story_invalid_religion_id(self):
        """Verify that story creation fails with 400 if religion_ids contains an invalid ID."""
        self.client.force_authenticate(user=self.user)
        data = {
            "title": "Story with invalid religion",
            "body": "Body text",
            "religion_ids": [9999]
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("religion_ids", response.data)


class StoryRetrieveAPITest(APITestCase):
    """Tests for GET /api/stories/ (#177)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="reader@example.com", username="reader", password="Pass123!"
        )
        self.other = User.objects.create_user(
            email="other@example.com", username="other", password="Pass123!"
        )
        self.published = Story.objects.create(
            title="Published Story", body="Visible to all",
            author=self.user, is_published=True
        )
        self.draft = Story.objects.create(
            title="Draft Story", body="Not visible",
            author=self.user, is_published=False
        )

    def test_public_list_shows_published_only(self):
        response = self.client.get(reverse('story-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # In a real DRF list, it might be in a 'results' key if paginated, 
        # but the StoryViewSet doesn't specify pagination (defaults to none or global).
        # Based on previous view_file, it returns a list directly.
        titles = [s['title'] for s in response.data]
        self.assertIn("Published Story", titles)
        self.assertNotIn("Draft Story", titles)

    def test_public_detail_published(self):
        url = reverse('story-detail', kwargs={'pk': self.published.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Published Story")
        self.assertIn('updated_at', response.data)

    def test_public_detail_draft_404(self):
        url = reverse('story-detail', kwargs={'pk': self.draft.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_author_can_see_own_drafts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('story-list'))
        titles = [s['title'] for s in response.data]
        self.assertIn("Draft Story", titles)


class StoryPublishAPITest(APITestCase):
    """Tests for publish/unpublish actions (#177)."""

    def setUp(self):
        self.author = User.objects.create_user(
            email="pub@example.com", username="publisher", password="Pass123!"
        )
        self.other = User.objects.create_user(
            email="rando@example.com", username="rando", password="Pass123!"
        )
        self.story = Story.objects.create(
            title="Draft", body="Unpublished story",
            author=self.author, is_published=False
        )

    def test_author_can_publish(self):
        self.client.force_authenticate(user=self.author)
        url = reverse('story-publish', kwargs={'pk': self.story.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_published'])

    def test_author_can_unpublish(self):
        self.story.is_published = True
        self.story.save()
        self.client.force_authenticate(user=self.author)
        url = reverse('story-unpublish', kwargs={'pk': self.story.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_published'])

    def test_non_author_cannot_publish(self):
        self.client.force_authenticate(user=self.other)
        url = reverse('story-publish', kwargs={'pk': self.story.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class StoryImageAPITest(APITestCase):
    """Tests for Story image upload (#307)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="imgauthor@example.com", username="imgauthor", password="Pass123!"
        )
        self.url = reverse('story-list')
        # 1x1 red pixel GIF
        self.test_image = SimpleUploadedFile(
            name='test.gif',
            content=b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\x00\x00\x00\x00\x00\x21\xf9\x04\x00\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b',
            content_type='image/gif'
        )

    def test_create_story_with_image(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'title': 'Image Story',
            'body': 'A story with a photo',
            'image': self.test_image,
        }
        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data['image'])
        self.assertIn('stories/images/', response.data['image'])

    def test_create_story_without_image(self):
        self.client.force_authenticate(user=self.user)
        data = {'title': 'No Image Story', 'body': 'Text only'}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['image'])

    def test_update_story_with_image(self):
        self.client.force_authenticate(user=self.user)
        # Create story without image first
        story = Story.objects.create(
            title='Patch Target', body='Will add image', author=self.user
        )
        url = reverse('story-detail', kwargs={'pk': story.id})
        patch_image = SimpleUploadedFile(
            name='patch.gif',
            content=b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\x00\x00\x00\x00\x00\x21\xf9\x04\x00\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b',
            content_type='image/gif'
        )
        response = self.client.patch(url, {'image': patch_image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['image'])
        self.assertIn('stories/images/', response.data['image'])
