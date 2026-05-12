from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.common.ids import ULID_REGEX
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
        self.assertIsInstance(response.data['id'], int)
        self.assertRegex(response.data['public_id'], ULID_REGEX)
        self.assertEqual(response.data['summary'], "Short intro")
        self.assertEqual(response.data['author_username'], "author")

    def test_created_stories_have_distinct_public_ids(self):
        self.client.force_authenticate(user=self.user)
        first = self.client.post(self.url, {"title": "First Story", "body": "First"})
        second = self.client.post(self.url, {"title": "Second Story", "body": "Second"})
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(first.data['public_id'], second.data['public_id'])

    def test_create_story_with_linked_recipe_legacy(self):
        """TC_API_STORY_004 - Story creation with linked recipe (bidirectional).

        Designer: Emirhan Simsek. Lab 9 acceptance test.
        Requirements: 3.5.1, 3.5.2, 3.5.3, 3.5.4, 3.3.9.

        Asserts the legacy linked_recipe write path returns the recipe ID and
        title in the read shape, that the new linked_recipes array reflects
        the link, and that the back-reference is observable from the recipe
        side (the recipe's story_count goes up and the model-level reverse
        relation Recipe.linked_stories includes the new story).

        Lab 9 cited a hypothetical Recipe.linkedStories[] field; the current
        serializer exposes the back-link as story_count plus the reverse
        manager. This assertion is the surviving bidirectional contract.
        """
        self.client.force_authenticate(user=self.user)

        recipe_before = self.client.get(reverse('recipe-detail', kwargs={'pk': self.recipe.id}))
        self.assertEqual(recipe_before.status_code, status.HTTP_200_OK)
        story_count_before = recipe_before.data['story_count']

        data = {
            "title": "Baklava Story",
            "body": "How I learned to make baklava",
            "linked_recipe": self.recipe.id,
            "is_published": True,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['linked_recipe'], self.recipe.id)
        self.assertEqual(response.data['recipe_title'], "Baklava")
        self.assertEqual(len(response.data['linked_recipes']), 1)
        self.assertEqual(response.data['linked_recipes'][0]['recipe_id'], self.recipe.id)

        new_story_id = response.data['id']
        recipe_after = self.client.get(reverse('recipe-detail', kwargs={'pk': self.recipe.id}))
        self.assertEqual(recipe_after.status_code, status.HTTP_200_OK)
        self.assertEqual(recipe_after.data['story_count'], story_count_before + 1)

        self.assertTrue(
            self.recipe.linked_stories.filter(id=new_story_id).exists(),
            "Recipe.linked_stories reverse relation must include the new story",
        )

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
        
        # 4. Verify that the response includes 'linked_recipes' array correctly ordered
        self.assertIn('linked_recipes', response.data)
        linked = response.data['linked_recipes']
        
        # We expect exactly these two recipes in this exact order
        self.assertEqual(len(linked), 2)
        self.assertEqual(linked[0]['recipe_id'], self.recipe.id)
        self.assertEqual(linked[0]['order'], 0)
        self.assertEqual(linked[1]['recipe_id'], recipe2.id)
        self.assertEqual(linked[1]['order'], 1)

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
        results = response.data.get('results', response.data)
        titles = [s['title'] for s in results]
        self.assertIn("Published Story", titles)
        self.assertNotIn("Draft Story", titles)

    def test_public_detail_published(self):
        url = reverse('story-detail', kwargs={'pk': self.published.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Published Story")
        self.assertIn('updated_at', response.data)

    def test_public_detail_accepts_public_id(self):
        url = reverse('story-detail', kwargs={'pk': self.published.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.published.id)
        self.assertEqual(response.data['public_id'], self.published.public_id)

    def test_public_detail_draft_404(self):
        url = reverse('story-detail', kwargs={'pk': self.draft.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_author_can_see_own_drafts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('story-list'))
        results = response.data.get('results', response.data)
        titles = [s['title'] for s in results]
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


class StoryTypeAPITest(APITestCase):
    """Tests for Story.story_type field (#565)."""

    VALID_CHOICES = ['traditional', 'historical', 'family', 'festive', 'personal']

    def setUp(self):
        self.user = User.objects.create_user(
            email="typer@example.com", username="typer", password="Pass123!"
        )
        self.list_url = reverse('story-list')

    def test_existing_story_without_story_type_serializes_null(self):
        story = Story.objects.create(
            title="Legacy", body="No type", author=self.user, is_published=True
        )
        response = self.client.get(reverse('story-detail', kwargs={'pk': story.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('story_type', response.data)
        self.assertIsNone(response.data['story_type'])

    def test_create_with_each_valid_story_type(self):
        self.client.force_authenticate(user=self.user)
        for choice in self.VALID_CHOICES:
            response = self.client.post(self.list_url, {
                "title": f"Story {choice}",
                "body": f"Body for {choice}",
                "story_type": choice,
            })
            self.assertEqual(
                response.status_code, status.HTTP_201_CREATED,
                f"Expected 201 for story_type={choice}, got {response.status_code}: {response.data}"
            )
            self.assertEqual(response.data['story_type'], choice)

            # Round-trip via detail
            detail = self.client.get(reverse('story-detail', kwargs={'pk': response.data['id']}))
            self.assertEqual(detail.status_code, status.HTTP_200_OK)
            self.assertEqual(detail.data['story_type'], choice)

    def test_create_with_invalid_story_type_returns_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.list_url, {
            "title": "Bad type",
            "body": "Should reject",
            "story_type": "not_a_real_type",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('story_type', response.data)

    def test_patch_sets_and_clears_story_type(self):
        self.client.force_authenticate(user=self.user)
        story = Story.objects.create(
            title="Patchable", body="Will toggle type", author=self.user, is_published=True
        )
        url = reverse('story-detail', kwargs={'pk': story.id})

        set_response = self.client.patch(url, {"story_type": "family"}, format='json')
        self.assertEqual(set_response.status_code, status.HTTP_200_OK)
        self.assertEqual(set_response.data['story_type'], "family")

        clear_response = self.client.patch(url, {"story_type": None}, format='json')
        self.assertEqual(clear_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(clear_response.data['story_type'])

    def test_list_filter_returns_only_matching_story_type(self):
        Story.objects.create(
            title="Trad 1", body="x", author=self.user,
            story_type="traditional", is_published=True,
        )
        Story.objects.create(
            title="Trad 2", body="y", author=self.user,
            story_type="traditional", is_published=True,
        )
        Story.objects.create(
            title="Family 1", body="z", author=self.user,
            story_type="family", is_published=True,
        )
        Story.objects.create(
            title="Untyped", body="n", author=self.user, is_published=True,
        )

        response = self.client.get(self.list_url, {"story_type": "traditional"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        titles = sorted(s['title'] for s in results)
        self.assertEqual(titles, ["Trad 1", "Trad 2"])
        for item in results:
            self.assertEqual(item['story_type'], "traditional")

    def test_list_filter_with_invalid_value_returns_empty(self):
        Story.objects.create(
            title="Trad 1", body="x", author=self.user,
            story_type="traditional", is_published=True,
        )
        response = self.client.get(self.list_url, {"story_type": "not_a_real_type"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(list(results), [])

class StoryAuthorFilterTest(APITestCase):
    """GET /api/stories/?author=<id> filtering tests."""

    @classmethod
    def setUpTestData(cls):
        cls.user1 = User.objects.create_user(
            email='sauthor1@example.com', username='sauthor1', password='Pass123!'
        )
        cls.user2 = User.objects.create_user(
            email='sauthor2@example.com', username='sauthor2', password='Pass123!'
        )

        Story.objects.create(
            title='Story 1', body='By author 1', author=cls.user1, is_published=True
        )
        Story.objects.create(
            title='Story 2', body='By author 1 again', author=cls.user1, is_published=True
        )
        Story.objects.create(
            title='Story 3', body='By author 2', author=cls.user2, is_published=True
        )
        cls.url = reverse('story-list')

    def test_filter_by_author_user1(self):
        response = self.client.get(self.url, {'author': self.user1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
        titles = sorted(r['title'] for r in results)
        self.assertEqual(titles, ['Story 1', 'Story 2'])

    def test_filter_by_author_user2(self):
        response = self.client.get(self.url, {'author': self.user2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Story 3')


class StoryGeoCoordinatesAPITest(APITestCase):
    """Tests for Story.latitude / Story.longitude fields (#730)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="geo@example.com", username="geo", password="Pass123!"
        )
        self.region = Region.objects.create(name="Anatolia")
        self.recipe = Recipe.objects.create(
            title="Mantı", description="Dumplings",
            region=self.region, author=self.user, is_published=True,
        )
        self.list_url = reverse('story-list')

    def _detail_url(self, story):
        return reverse('story-detail', kwargs={'pk': story.id})

    def test_detail_includes_null_coordinates_by_default(self):
        story = Story.objects.create(
            title="No coords", body="Body", author=self.user, is_published=True,
        )
        response = self.client.get(self._detail_url(story))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('latitude', response.data)
        self.assertIn('longitude', response.data)
        self.assertIsNone(response.data['latitude'])
        self.assertIsNone(response.data['longitude'])

    def test_patch_sets_coordinates(self):
        self.client.force_authenticate(user=self.user)
        story = Story.objects.create(
            title="Patchable coords", body="Body", author=self.user, is_published=True,
        )
        url = self._detail_url(story)
        response = self.client.patch(
            url, {"latitude": "41.008200", "longitude": "28.978400"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['latitude']), "41.008200")
        self.assertEqual(str(response.data['longitude']), "28.978400")

        get_response = self.client.get(url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(get_response.data['latitude']), "41.008200")
        self.assertEqual(str(get_response.data['longitude']), "28.978400")

    def test_patch_clears_coordinates(self):
        self.client.force_authenticate(user=self.user)
        story = Story.objects.create(
            title="Clearable coords", body="Body", author=self.user, is_published=True,
            latitude="38.423700", longitude="27.142800",
        )
        url = self._detail_url(story)
        response = self.client.patch(
            url, {"latitude": None, "longitude": None}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['latitude'])
        self.assertIsNone(response.data['longitude'])

        get_response = self.client.get(url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(get_response.data['latitude'])
        self.assertIsNone(get_response.data['longitude'])

    def test_coordinates_independent_of_region_and_linked_recipes(self):
        """A story may carry coordinates with or without a region / linked recipes."""
        self.client.force_authenticate(user=self.user)
        # No region, no linked recipe.
        bare = self.client.post(self.list_url, {
            "title": "Bare with coords", "body": "Body",
            "latitude": "40.000000", "longitude": "29.000000",
        }, format='json')
        self.assertEqual(bare.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(bare.data['latitude']), "40.000000")
        self.assertEqual(str(bare.data['longitude']), "29.000000")
        self.assertIsNone(bare.data['region'])

        # With region and linked recipe.
        linked = self.client.post(self.list_url, {
            "title": "Linked with coords", "body": "Body",
            "region": self.region.id, "linked_recipe_id": self.recipe.id,
            "latitude": "41.500000", "longitude": "30.500000",
        }, format='json')
        self.assertEqual(linked.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(linked.data['latitude']), "41.500000")
        self.assertEqual(str(linked.data['longitude']), "30.500000")
        self.assertEqual(linked.data['region'], self.region.id)

    def test_list_includes_coordinate_fields(self):
        Story.objects.create(
            title="Listed", body="Body", author=self.user, is_published=True,
            latitude="39.925000", longitude="32.866900",
        )
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)
        self.assertIn('latitude', results[0])
        self.assertIn('longitude', results[0])
        match = next(r for r in results if r['title'] == "Listed")
        self.assertEqual(str(match['latitude']), "39.925000")
        self.assertEqual(str(match['longitude']), "32.866900")
