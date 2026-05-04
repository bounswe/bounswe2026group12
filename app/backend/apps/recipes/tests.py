from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import Recipe, Region, Ingredient, Unit, RecipeIngredient
from django.contrib.auth import get_user_model

User = get_user_model()

class PublicEndpointTest(APITestCase):
    """
    Verification tests for Issue #147: Public Endpoints.
    Ensures search and retrieval do not require an authorization token.
    """

    def setUp(self):
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
        self.recipe_list_url = reverse('recipe-list')
        self.recipe_detail_url = reverse('recipe-detail', kwargs={'pk': self.recipe.pk})
        self.search_url = reverse('global_search')

    def test_recipe_list_is_public(self):
        response = self.client.get(self.recipe_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], "Hummus")

    def test_recipe_detail_is_public(self):
        response = self.client.get(self.recipe_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Hummus")

    def test_search_is_public(self):
        response = self.client.get(self.search_url, {'q': 'Hummus'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recipes', response.data)
        self.assertEqual(response.data['recipes'][0]['title'], "Hummus")

    def test_creation_requires_auth(self):
        data = {
            "title": "New Recipe",
            "description": "Unauthenticated POST",
            "region": self.region.pk
        }
        response = self.client.post(self.recipe_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RecipeCreateAPITest(APITestCase):
    """Tests for POST /api/recipes/ — creation and validation (#175)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="chef@example.com", username="chef", password="StrongPass123!"
        )
        self.region = Region.objects.create(name="Turkish")
        self.ingredient = Ingredient.objects.create(name="Chickpeas", is_approved=True)
        self.unit = Unit.objects.create(name="grams", is_approved=True)
        self.client.force_authenticate(user=self.user)
        self.url = reverse('recipe-list')

    def test_create_recipe_success(self):
        data = {
            "title": "Hummus",
            "description": "Creamy chickpea dip",
            "region": self.region.id,
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "200.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "Hummus")
        self.assertEqual(response.data['author_username'], "chef")
        self.assertEqual(len(response.data['ingredients']), 1)

    def test_create_recipe_missing_title(self):
        data = {
            "description": "No title",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "1.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_create_recipe_missing_description(self):
        data = {
            "title": "No Desc",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "1.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_create_recipe_no_ingredients_rejected(self):
        data = {"title": "Empty", "description": "No ingredients"}
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ingredients_write', response.data)

    def test_create_recipe_negative_amount_rejected(self):
        data = {
            "title": "Bad Amount",
            "description": "Negative",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "-5.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_recipe_zero_amount_rejected(self):
        data = {
            "title": "Zero",
            "description": "Zero amount",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "0.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_recipe_multiple_ingredients(self):
        flour = Ingredient.objects.create(name="Flour", is_approved=True)
        data = {
            "title": "Bread",
            "description": "Simple bread",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "100.00", "unit": self.unit.id},
                {"ingredient": flour.id, "amount": "250.00", "unit": self.unit.id},
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['ingredients']), 2)

    def test_created_recipe_is_not_published_by_default(self):
        data = {
            "title": "Draft",
            "description": "Should be unpublished",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "1.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_published'])


class RecipeEditAPITest(APITestCase):
    """Tests for PUT/PATCH /api/recipes/:id/ — editing (#175)."""

    def setUp(self):
        self.author = User.objects.create_user(
            email="author@example.com", username="author", password="StrongPass123!"
        )
        self.other = User.objects.create_user(
            email="other@example.com", username="other", password="StrongPass123!"
        )
        self.ingredient = Ingredient.objects.create(name="Tomato", is_approved=True)
        self.unit = Unit.objects.create(name="pieces", is_approved=True)
        self.recipe = Recipe.objects.create(
            title="Salad", description="Green salad", author=self.author
        )
        RecipeIngredient.objects.create(
            recipe=self.recipe, ingredient=self.ingredient, amount=3, unit=self.unit
        )

    def test_author_can_patch_title(self):
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.patch(url, {"title": "Caesar Salad"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Caesar Salad")

    def test_author_can_put_full_update(self):
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        data = {
            "title": "New Salad",
            "description": "Updated",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "5.00", "unit": self.unit.id}
            ]
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ingredients'][0]['amount'], '5.00')

    def test_non_author_gets_403(self):
        self.client.force_authenticate(user=self.other)
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.patch(url, {"title": "Hijacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.patch(url, {"title": "Anonymous"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_edit_replaces_ingredients(self):
        self.client.force_authenticate(user=self.author)
        new_ing = Ingredient.objects.create(name="Cucumber", is_approved=True)
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        data = {
            "title": "Salad",
            "description": "Green salad",
            "ingredients_write": [
                {"ingredient": new_ing.id, "amount": "2.00", "unit": self.unit.id}
            ]
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['ingredients']), 1)
        self.assertEqual(response.data['ingredients'][0]['ingredient_name'], "Cucumber")


class RecipePublishAPITest(APITestCase):
    """Tests for publish/unpublish actions (#175)."""

    def setUp(self):
        self.author = User.objects.create_user(
            email="pub@example.com", username="publisher", password="StrongPass123!"
        )
        self.other = User.objects.create_user(
            email="rando@example.com", username="rando", password="StrongPass123!"
        )
        self.recipe = Recipe.objects.create(
            title="Draft Recipe", description="Unpublished", author=self.author
        )

    def test_author_can_publish(self):
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-publish', kwargs={'pk': self.recipe.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_published'])

    def test_author_can_unpublish(self):
        self.recipe.is_published = True
        self.recipe.save()
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-unpublish', kwargs={'pk': self.recipe.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_published'])

    def test_non_author_cannot_publish(self):
        self.client.force_authenticate(user=self.other)
        url = reverse('recipe-publish', kwargs={'pk': self.recipe.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_published_recipe_visible_in_detail(self):
        self.recipe.is_published = True
        self.recipe.save()
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_published'])
