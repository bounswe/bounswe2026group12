"""Tests for the seed_ingredient_densities management command."""
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.recipes.management.commands.seed_ingredient_densities import SEED_DENSITIES
from apps.recipes.models import Ingredient


class SeedIngredientDensitiesTests(TestCase):
    def test_curated_rows_have_density_after_run(self):
        out = StringIO()
        call_command('seed_ingredient_densities', stdout=out)

        # Every name in SEED_DENSITIES should now exist with the right density.
        for name, density in SEED_DENSITIES.items():
            ingredient = Ingredient.objects.get(name=name)
            self.assertEqual(ingredient.density_g_per_ml, density)

        # Curated list size sanity check (use >= so we don't break on additions).
        self.assertGreaterEqual(len(SEED_DENSITIES), 10)

    def test_runs_idempotently(self):
        # Two consecutive runs must not raise and must not change row count.
        call_command('seed_ingredient_densities', stdout=StringIO())
        first_count = Ingredient.objects.count()

        call_command('seed_ingredient_densities', stdout=StringIO())
        second_count = Ingredient.objects.count()

        self.assertEqual(first_count, second_count)

    def test_preserves_existing_ingredient_with_different_density(self):
        # Pre-create a curated ingredient with a wrong density. Seeder should
        # fix it on first run, then leave it alone on second.
        Ingredient.objects.create(
            name='Water', is_approved=True, density_g_per_ml=Decimal('0.5000'),
        )
        call_command('seed_ingredient_densities', stdout=StringIO())
        water = Ingredient.objects.get(name='Water')
        self.assertEqual(water.density_g_per_ml, SEED_DENSITIES['Water'])

        # Same row id is reused (no duplicate created).
        water_count = Ingredient.objects.filter(name='Water').count()
        self.assertEqual(water_count, 1)
