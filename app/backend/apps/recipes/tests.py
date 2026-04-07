from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import Recipe, Region
from django.contrib.auth import get_user_model

User = get_user_model()

class PublicEndpointTest(APITestCase):
    """
    Verification tests for Issue #147: Public Endpoints.
    Ensures search and retrieval do not require an authorization token.
    """

    def setUp(self):
        # Create common setup data
        self.region = Region.objects.create(name="Mediterranean")
        self.user = User.objects.create_user(
            email="author@example.com",
            username="author",
            password="SecurePass123!"
        )
        self.recipe = Recipe.objects.create(
            title="Hummus",
            description="Traditional chickpea dip.",
            region=self.region,
            author=self.user,
            is_published=True
        )
        
        # URLs
        self.recipe_list_url = reverse('recipe-list')
        self.recipe_detail_url = reverse('recipe-detail', kwargs={'pk': self.recipe.pk})
        self.search_url = reverse('global_search')

    def test_recipe_list_is_public(self):
        """GET /api/recipes/ should return 200 without a token."""
        response = self.client.get(self.recipe_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify content
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Hummus")

    def test_recipe_detail_is_public(self):
        """GET /api/recipes/<id>/ should return 200 without a token."""
        response = self.client.get(self.recipe_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Hummus")

    def test_search_is_public(self):
        """GET /api/search/?q=... should return 200 without a token."""
        response = self.client.get(self.search_url, {'q': 'Hummus'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recipes', response.data)
        self.assertEqual(response.data['recipes'][0]['title'], "Hummus")

    def test_creation_requires_auth(self):
        """POST /api/recipes/ should return 401 without a token."""
        data = {
            "title": "New Recipe",
            "description": "Unauthenticated POST",
            "region": self.region.pk
        }
        response = self.client.post(self.recipe_list_url, data)
        # Based on IsAuthenticatedOrReadOnly, POST should be 401/403
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
