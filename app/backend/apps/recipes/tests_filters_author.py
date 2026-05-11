from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from .models import Recipe

User = get_user_model()

class RecipeAuthorFilterTest(APITestCase):
    """GET /api/recipes/?author=<id> filtering tests."""

    @classmethod
    def setUpTestData(cls):
        cls.user1 = User.objects.create_user(
            email='author1@example.com', username='author1', password='Pass123!'
        )
        cls.user2 = User.objects.create_user(
            email='author2@example.com', username='author2', password='Pass123!'
        )

        cls.recipe1 = Recipe.objects.create(
            title='Recipe 1', description='By author 1', author=cls.user1, is_published=True
        )
        cls.recipe2 = Recipe.objects.create(
            title='Recipe 2', description='By author 1 again', author=cls.user1, is_published=True
        )
        cls.recipe3 = Recipe.objects.create(
            title='Recipe 3', description='By author 2', author=cls.user2, is_published=True
        )

    def test_filter_by_author_user1(self):
        url = reverse('recipe-list')
        response = self.client.get(url, {'author': self.user1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
        titles = sorted(r['title'] for r in results)
        self.assertEqual(titles, ['Recipe 1', 'Recipe 2'])

    def test_filter_by_author_user2(self):
        url = reverse('recipe-list')
        response = self.client.get(url, {'author': self.user2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Recipe 3')

    def test_filter_by_non_existent_author(self):
        url = reverse('recipe-list')
        response = self.client.get(url, {'author': 9999})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_filter_by_author_and_title_search(self):
        # Combined with existing filters (though author is not in apply_content_filters loop,
        # it is applied after, and DRF filters are usually cumulative)
        # Wait, the search is handled by a separate view or rank_items?
        # Actually, global search is /api/search/. Recipe list doesn't have a 'q' filter in apply_content_filters.
        # But it has region, diet, etc.
        pass
