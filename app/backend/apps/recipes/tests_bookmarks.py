from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.recipes.models import Recipe, Bookmark

User = get_user_model()


class BookmarkAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester', email='tester@example.com', password='password123'
        )
        self.other_user = User.objects.create_user(
            username='other', email='other@example.com', password='password123'
        )
        self.author = User.objects.create_user(
            username='author', email='author@example.com', password='password123'
        )

        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            description='Test description',
            author=self.author,
            is_published=True,
        )
        self.other_recipe = Recipe.objects.create(
            title='Other Recipe',
            description='Other description',
            author=self.author,
            is_published=True,
        )

        self.bookmark_url = f'/api/recipes/{self.recipe.id}/bookmark/'
        self.list_url = '/api/recipes/'
        self.user_me_url = '/api/users/me/'

    # ------------------------------------------------------------------
    # Auth guard
    # ------------------------------------------------------------------

    def test_anon_toggle_returns_401(self):
        """Unauthenticated POST to /bookmark/ must return 401."""
        response = self.client.post(self.bookmark_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Bookmark.objects.count(), 0)

    # ------------------------------------------------------------------
    # Toggle behaviour
    # ------------------------------------------------------------------

    def test_first_bookmark_creates_and_returns_201(self):
        """First POST by an authenticated user creates a Bookmark and returns 201."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.bookmark_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_bookmarked'])
        self.assertEqual(response.data['bookmark_count'], 1)
        self.assertEqual(Bookmark.objects.filter(recipe=self.recipe, user=self.user).count(), 1)

    def test_second_bookmark_toggles_off_and_returns_200(self):
        """Second POST from the same user deletes the Bookmark and returns 200."""
        self.client.force_authenticate(user=self.user)
        self.client.post(self.bookmark_url)  # first bookmark

        response = self.client.post(self.bookmark_url)  # toggle off
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_bookmarked'])
        self.assertEqual(response.data['bookmark_count'], 0)
        self.assertEqual(Bookmark.objects.filter(recipe=self.recipe, user=self.user).count(), 0)

    # ------------------------------------------------------------------
    # List Filtering
    # ------------------------------------------------------------------

    def test_filter_bookmarked_true(self):
        """?bookmarked=true returns only recipes bookmarked by the caller."""
        Bookmark.objects.create(user=self.user, recipe=self.recipe)
        # other_recipe is NOT bookmarked by self.user

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'{self.list_url}?bookmarked=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.recipe.id)

    def test_filter_bookmarked_false_for_other_user(self):
        """?bookmarked=true for user B does not see user A's bookmarks."""
        Bookmark.objects.create(user=self.user, recipe=self.recipe)

        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(f'{self.list_url}?bookmarked=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    # ------------------------------------------------------------------
    # Serializer fields
    # ------------------------------------------------------------------

    def test_recipe_detail_is_bookmarked_field(self):
        """Recipe detail includes is_bookmarked and bookmark_count."""
        Bookmark.objects.create(user=self.user, recipe=self.recipe)
        Bookmark.objects.create(user=self.other_user, recipe=self.recipe)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/recipes/{self.recipe.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_bookmarked'])
        self.assertEqual(response.data['bookmark_count'], 2)

    def test_is_bookmarked_null_for_anon(self):
        """is_bookmarked is null for unauthenticated requests."""
        Bookmark.objects.create(user=self.user, recipe=self.recipe)

        response = self.client.get(f'/api/recipes/{self.recipe.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['is_bookmarked'])
        self.assertEqual(response.data['bookmark_count'], 1)

    # ------------------------------------------------------------------
    # User profile count
    # ------------------------------------------------------------------

    def test_user_me_bookmark_count(self):
        """/api/users/me/ includes total bookmark count for the user."""
        Bookmark.objects.create(user=self.user, recipe=self.recipe)
        Bookmark.objects.create(user=self.user, recipe=self.other_recipe)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.user_me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bookmark_count'], 2)
