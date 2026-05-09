from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Ingredient, Unit


class LookupApiTests(APITestCase):
    def setUp(self):
        self.ingredient_list_url = reverse('ingredient-list')
        self.unit_list_url = reverse('unit-list')

        self.apple = Ingredient.objects.create(name='Apple', is_approved=True)
        self.banana = Ingredient.objects.create(name='banana', is_approved=True)
        Ingredient.objects.create(name='Waiting approval')

        self.cup = Unit.objects.create(name='cup', is_approved=True)
        self.tablespoon = Unit.objects.create(name='Tablespoon', is_approved=True)
        Unit.objects.create(name='Pending unit')

    def test_ingredient_lookup_returns_approved_ingredients_for_dropdowns(self):
        response = self.client.get(self.ingredient_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Scope to fixtures created here. The endpoint also returns rows seeded
        # by 0005_seed_ingredients_units; assertion stays exact for our IDs.
        created_ids = {self.apple.id, self.banana.id}
        filtered = [row for row in response.data if row['id'] in created_ids]
        self.assertEqual(
            filtered,
            [
                {'id': self.apple.id, 'name': 'Apple'},
                {'id': self.banana.id, 'name': 'banana'},
            ],
        )

    def test_unit_lookup_returns_approved_units_for_dropdowns(self):
        response = self.client.get(self.unit_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        created_ids = {self.cup.id, self.tablespoon.id}
        filtered = [row for row in response.data if row['id'] in created_ids]
        self.assertEqual(
            filtered,
            [
                {'id': self.cup.id, 'name': 'cup'},
                {'id': self.tablespoon.id, 'name': 'Tablespoon'},
            ],
        )
