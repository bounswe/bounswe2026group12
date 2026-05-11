"""Tests for the seed_ingredient_routes management command (#523)."""
from django.core.management import call_command
from django.test import TestCase

from .models import Ingredient, IngredientRoute


class SeedIngredientRoutesCommandTest(TestCase):
    """Verify the seeder hits 10 iconic ingredients, is idempotent, and
    leaves every seeded ingredient with a route that has at least two
    waypoints (a single point is not a "route")."""

    SEEDED_NAMES = [
        'Tomato', 'Potato', 'Chili Pepper', 'Coffee', 'Sugar',
        'Rice', 'Wheat', 'Cinnamon', 'Chocolate', 'Corn',
    ]

    def test_command_seeds_ten_routes_and_is_idempotent(self):
        call_command('seed_ingredient_routes')
        self.assertEqual(IngredientRoute.objects.count(), 10)
        for route in IngredientRoute.objects.all():
            self.assertGreaterEqual(len(route.waypoints), 2)

        # Rerun: no duplicates, still 10 routes.
        call_command('seed_ingredient_routes')
        self.assertEqual(IngredientRoute.objects.count(), 10)

    def test_seeded_ingredients_exist_and_have_routes(self):
        call_command('seed_ingredient_routes')
        for name in self.SEEDED_NAMES:
            ingredient = Ingredient.objects.get(name=name)
            self.assertTrue(ingredient.migration_routes.exists())

    def test_updates_existing_route_in_place(self):
        # Seed a stub route first to prove the command updates rather than
        # duplicating when the Ingredient already has one.
        tomato, _ = Ingredient.objects.get_or_create(
            name='Tomato', defaults={'is_approved': True},
        )
        IngredientRoute.objects.create(ingredient=tomato, waypoints=[])

        call_command('seed_ingredient_routes')

        self.assertEqual(IngredientRoute.objects.filter(ingredient=tomato).count(), 1)
        refreshed = IngredientRoute.objects.get(ingredient=tomato)
        self.assertGreaterEqual(len(refreshed.waypoints), 2)
