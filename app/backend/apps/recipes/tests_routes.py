from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Ingredient, IngredientRoute


class IngredientRouteAPITests(APITestCase):
    def setUp(self):
        self.ingredient, _ = Ingredient.objects.get_or_create(
            name="Tomato",
            defaults={"is_approved": True}
        )
        self.route = IngredientRoute.objects.create(
            ingredient=self.ingredient,
            waypoints=[
                {"lat": -9.19, "lng": -75.01, "era": "Ancestral", "label": "Andes (Peru)"},
                {"lat": 40.41, "lng": -3.70, "era": "1500s", "label": "Spain"},
                {"lat": 41.90, "lng": 12.49, "era": "1600s", "label": "Italy"},
            ]
        )
        self.list_url = reverse('ingredient-route-list')
        self.detail_url = reverse('ingredient-route-detail', args=[self.route.id])

    def test_list_routes(self):
        """Anyone can list ingredient migration routes."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['ingredient_name'], "Tomato")
        self.assertEqual(len(response.data[0]['waypoints']), 3)

    def test_retrieve_route(self):
        """Anyone can retrieve a specific route."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ingredient_name'], "Tomato")
        self.assertEqual(response.data['waypoints'][0]['label'], "Andes (Peru)")

    def test_filter_by_ingredient(self):
        """Filtering by ingredient_id works."""
        other_ing = Ingredient.objects.create(name="Unique Test Coffee", is_approved=True)
        IngredientRoute.objects.create(ingredient=other_ing, waypoints=[])

        response = self.client.get(f"{self.list_url}?ingredient={self.ingredient.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['ingredient_name'], "Tomato")

    def test_staff_only_writes(self):
        """Authenticated non-staff users cannot create routes."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.create_user(username="regular", email="regular@example.com", password="password")
        self.client.force_authenticate(user=user)

        data = {
            "ingredient": self.ingredient.id,
            "waypoints": []
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
