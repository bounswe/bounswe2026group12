from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

User = get_user_model()


class SearchAPITest(APITestCase):
    """Tests for GET /api/search/ (#177)."""

    def setUp(self):
        self.url = reverse('global_search')
        self.region_tr, _ = Region.objects.get_or_create(name="Turkish")
        self.region_it, _ = Region.objects.get_or_create(name="Italian")

        self.user_tr = User.objects.create_user(
            email="tr@example.com", username="truser", password="Pass123!",
            preferred_language="tr"
        )
        self.user_en = User.objects.create_user(
            email="en@example.com", username="enuser", password="Pass123!",
            preferred_language="en"
        )

        self.recipe_tr = Recipe.objects.create(
            title="Baklava", description="Sweet pastry",
            region=self.region_tr, author=self.user_tr, is_published=True
        )
        self.recipe_it = Recipe.objects.create(
            title="Pizza Margherita", description="Classic Italian pizza",
            region=self.region_it, author=self.user_en, is_published=True
        )
        self.recipe_unpublished = Recipe.objects.create(
            title="Secret Recipe", description="Not published",
            region=self.region_tr, author=self.user_tr, is_published=False
        )

        self.story_tr = Story.objects.create(
            title="Grandma's Baklava Story", body="My grandmother used to make baklava",
            author=self.user_tr, is_published=True
        )
        # Use the new through-model relation for M2M
        from apps.stories.models import StoryRecipeLink
        StoryRecipeLink.objects.create(story=self.story_tr, recipe=self.recipe_tr, order=0)

        self.story_unpublished = Story.objects.create(
            title="Draft Story", body="Not ready yet",
            author=self.user_en, is_published=False
        )

    def test_search_by_query(self):
        response = self.client.get(self.url, {'q': 'Baklava'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 1)
        self.assertEqual(response.data['recipes'][0]['title'], "Baklava")
        self.assertEqual(len(response.data['stories']), 1)

    def test_search_by_region(self):
        response = self.client.get(self.url, {'region': 'Turkish'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 1)
        self.assertEqual(response.data['recipes'][0]['title'], "Baklava")

    def test_search_by_region_italian(self):
        response = self.client.get(self.url, {'region': 'Italian'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 1)
        self.assertEqual(response.data['recipes'][0]['title'], "Pizza Margherita")

    def test_search_by_language(self):
        response = self.client.get(self.url, {'language': 'tr'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 1)
        self.assertEqual(response.data['recipes'][0]['title'], "Baklava")

    def test_search_combined_query_and_region(self):
        response = self.client.get(self.url, {'q': 'pizza', 'region': 'Italian'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 1)
        self.assertEqual(response.data['recipes'][0]['title'], "Pizza Margherita")

    def test_search_no_match_returns_empty(self):
        response = self.client.get(self.url, {'q': 'nonexistent'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 0)
        self.assertEqual(len(response.data['stories']), 0)
        self.assertEqual(response.data['total_count'], 0)

    def test_search_excludes_unpublished(self):
        response = self.client.get(self.url, {'q': 'Secret'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 0)

    def test_search_empty_query_returns_all_published(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 2)
        self.assertEqual(len(response.data['stories']), 1)

    def test_search_result_has_metadata(self):
        response = self.client.get(self.url, {'q': 'Baklava'})
        recipe = response.data['recipes'][0]
        self.assertEqual(recipe['result_type'], 'recipe')
        self.assertIn('region_tag', recipe)
        self.assertIn('author_username', recipe)

    def test_search_total_count(self):
        response = self.client.get(self.url, {'q': 'Baklava'})
        self.assertEqual(response.data['total_count'], 2)

    def test_search_is_public(self):
        response = self.client.get(self.url, {'q': 'pizza'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
