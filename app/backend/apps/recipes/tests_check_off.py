from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import (
    Ingredient, IngredientCheckOff, Recipe, RecipeIngredient, Unit,
)

User = get_user_model()


class CheckedIngredientsAPITests(APITestCase):
    """Coverage for /api/recipes/<recipe_id>/checked-ingredients/ (#529)."""

    @classmethod
    def setUpTestData(cls):
        cls.author = User.objects.create_user(
            username='author', email='author@example.com', password='password123',
        )
        cls.alice = User.objects.create_user(
            username='alice', email='alice@example.com', password='password123',
        )
        cls.bob = User.objects.create_user(
            username='bob', email='bob@example.com', password='password123',
        )

        cls.recipe = Recipe.objects.create(
            title='Menemen',
            description='Eggs and tomatoes.',
            author=cls.author,
            is_published=True,
        )
        cls.other_recipe = Recipe.objects.create(
            title='Plain Toast',
            description='Just toast.',
            author=cls.author,
            is_published=True,
        )

        cls.gram, _ = Unit.objects.get_or_create(
            name='g', defaults={'is_approved': True},
        )
        cls.tomato = Ingredient.objects.create(name='Tomato-checkoff-529', is_approved=True)
        cls.egg = Ingredient.objects.create(name='Egg-checkoff-529', is_approved=True)
        cls.bread = Ingredient.objects.create(name='Bread-checkoff-529', is_approved=True)

        RecipeIngredient.objects.create(
            recipe=cls.recipe, ingredient=cls.tomato, amount=Decimal('200'), unit=cls.gram,
        )
        RecipeIngredient.objects.create(
            recipe=cls.recipe, ingredient=cls.egg, amount=Decimal('3'), unit=cls.gram,
        )
        RecipeIngredient.objects.create(
            recipe=cls.other_recipe, ingredient=cls.bread, amount=Decimal('2'), unit=cls.gram,
        )

    def setUp(self):
        self.url = f'/api/recipes/{self.recipe.id}/checked-ingredients/'

    # GET ------------------------------------------------------------------

    def test_get_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_returns_empty_list_when_no_checks(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    # POST -----------------------------------------------------------------

    def test_post_check_inserts_row_and_returns_state(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post(
            self.url, {'ingredient_id': self.tomato.id, 'checked': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [self.tomato.id])
        self.assertEqual(
            IngredientCheckOff.objects.filter(
                user=self.alice, recipe=self.recipe, ingredient=self.tomato,
            ).count(),
            1,
        )

    def test_post_check_is_idempotent(self):
        self.client.force_authenticate(user=self.alice)
        first = self.client.post(
            self.url, {'ingredient_id': self.tomato.id, 'checked': True}, format='json',
        )
        second = self.client.post(
            self.url, {'ingredient_id': self.tomato.id, 'checked': True}, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data, [self.tomato.id])
        self.assertEqual(
            IngredientCheckOff.objects.filter(
                user=self.alice, recipe=self.recipe, ingredient=self.tomato,
            ).count(),
            1,
        )

    def test_post_uncheck_removes_row(self):
        IngredientCheckOff.objects.create(
            user=self.alice, recipe=self.recipe, ingredient=self.tomato,
        )
        self.client.force_authenticate(user=self.alice)
        response = self.client.post(
            self.url, {'ingredient_id': self.tomato.id, 'checked': False}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
        self.assertFalse(
            IngredientCheckOff.objects.filter(
                user=self.alice, recipe=self.recipe, ingredient=self.tomato,
            ).exists(),
        )

    def test_post_uncheck_when_not_checked_is_noop(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post(
            self.url, {'ingredient_id': self.tomato.id, 'checked': False}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    # Cross-user isolation -------------------------------------------------

    def test_users_do_not_see_each_others_checks(self):
        self.client.force_authenticate(user=self.alice)
        self.client.post(
            self.url, {'ingredient_id': self.tomato.id, 'checked': True}, format='json',
        )
        self.client.post(
            self.url, {'ingredient_id': self.egg.id, 'checked': True}, format='json',
        )

        self.client.force_authenticate(user=self.bob)
        bob_get = self.client.get(self.url)
        self.assertEqual(bob_get.status_code, status.HTTP_200_OK)
        self.assertEqual(bob_get.data, [])

        bob_post = self.client.post(
            self.url, {'ingredient_id': self.tomato.id, 'checked': True}, format='json',
        )
        self.assertEqual(bob_post.data, [self.tomato.id])

        self.client.force_authenticate(user=self.alice)
        alice_get = self.client.get(self.url)
        self.assertEqual(
            sorted(alice_get.data), sorted([self.tomato.id, self.egg.id]),
        )

    # Validation -----------------------------------------------------------

    def test_post_with_ingredient_not_in_recipe_returns_400(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post(
            self.url, {'ingredient_id': self.bread.id, 'checked': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(IngredientCheckOff.objects.exists())

    def test_post_against_missing_recipe_returns_404(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post(
            '/api/recipes/999999/checked-ingredients/',
            {'ingredient_id': self.tomato.id, 'checked': True},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_with_invalid_body_returns_400(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post(
            self.url, {'ingredient_id': 'not-an-int', 'checked': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
