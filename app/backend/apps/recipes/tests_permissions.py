from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from apps.recipes.models import Recipe, Ingredient, Unit

User = get_user_model()

class PermissionTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='user1@example.com', username='user1', password='password123')
        self.user2 = User.objects.create_user(email='user2@example.com', username='user2', password='password123')
        self.admin = User.objects.create_superuser(email='admin@example.com', username='admin', password='password123')
        
        self.ingredient = Ingredient.objects.create(name="Salt")
        self.unit = Unit.objects.create(name="Gram")
        
        self.recipe = Recipe.objects.create(
            title="User1 Recipe",
            description="Test description",
            author=self.user1
        )

    def test_unauthenticated_can_list_recipes(self):
        response = self.client.get('/api/recipes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_create_recipe(self):
        data = {"title": "New Recipe", "description": "Desc"}
        response = self.client.post('/api/recipes/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_can_create_recipe(self):
        self.client.force_authenticate(user=self.user1)
        data = {"title": "New Recipe", "description": "Desc"}
        response = self.client.post('/api/recipes/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_author_can_edit_own_recipe(self):
        self.client.force_authenticate(user=self.user1)
        data = {"title": "Updated Title"}
        response = self.client.patch(f'/api/recipes/{self.recipe.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_author_cannot_edit_recipe(self):
        self.client.force_authenticate(user=self.user2)
        data = {"title": "Stolen Title"}
        response = self.client.patch(f'/api/recipes/{self.recipe.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_can_list_ingredients(self):
        response = self.client.get('/api/ingredients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_can_create_ingredient(self):
        self.client.force_authenticate(user=self.user1)
        data = {"name": "Pepper"}
        response = self.client.post('/api/ingredients/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Ingredient.objects.get(name="Pepper").is_approved)

    def test_regular_user_cannot_edit_ingredient(self):
        self.client.force_authenticate(user=self.user1)
        data = {"name": "Illegal Rename"}
        response = self.client.patch(f'/api/ingredients/{self.ingredient.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_edit_and_approve_ingredient(self):
        self.client.force_authenticate(user=self.admin)
        data = {"is_approved": True}
        response = self.client.patch(f'/api/ingredients/{self.ingredient.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ingredient.refresh_from_db()
        self.assertTrue(self.ingredient.is_approved)
