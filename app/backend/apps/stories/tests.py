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
        data = {"title": "My Story", "body": "A great culinary journey"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "My Story")
        self.assertEqual(response.data['author_username'], "author")

    def test_create_story_with_linked_recipe(self):
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

    def test_create_story_without_linked_recipe(self):
        self.client.force_authenticate(user=self.user)
        data = {"title": "Solo Story", "body": "No recipe linked"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['linked_recipe'])

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
        titles = [s['title'] for s in response.data]
        self.assertIn("Published Story", titles)
        self.assertNotIn("Draft Story", titles)

    def test_public_detail_published(self):
        url = reverse('story-detail', kwargs={'pk': self.published.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Published Story")

    def test_public_detail_draft_404(self):
        url = reverse('story-detail', kwargs={'pk': self.draft.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_author_can_see_own_drafts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('story-list'))
        titles = [s['title'] for s in response.data]
        self.assertIn("Draft Story", titles)

    def test_authenticated_list_includes_rank_fields_and_orders_matches_first(self):
        region, _ = Region.objects.get_or_create(name="Aegean")
        recipe = Recipe.objects.create(
            title="Aegean Dish",
            description="Regional recipe",
            region=region,
            author=self.user,
            is_published=True,
        )
        Story.objects.create(
            title="Aegean Memory",
            body="A regional memory",
            author=self.user,
            linked_recipe=recipe,
            is_published=True,
        )
        reader = User.objects.create_user(
            email="aegean-reader@example.com",
            username="aegeanreader",
            password="Pass123!",
            regional_ties=["Aegean"],
        )
        self.client.force_authenticate(user=reader)
        response = self.client.get(reverse('story-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['title'], "Aegean Memory")
        self.assertEqual(response.data[0]['rank_reason'], "regional_match")
        self.assertGreater(response.data[0]['rank_score'], 0)


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
