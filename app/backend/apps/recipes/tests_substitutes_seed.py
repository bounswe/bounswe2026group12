"""Regression: seed_canonical must (re)populate IngredientSubstitution rows.

Migration 0010 seeds 47 substitution pairs, but if those rows are wiped
between `migrate` and `seed_canonical` (e.g., a `manage.py flush`, a manual
truncate, or restoring the DB from a snapshot taken before 0010 was
applied), the substitutes endpoint silently returns empty arrays. These
tests pin down the contract: after seed_canonical, the substitution graph
exists and the documented anchor pairs are queryable.
"""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.recipes.models import Ingredient, IngredientSubstitution


class SeedCanonicalRestoresSubstitutionsTests(TestCase):
    def test_substitutions_present_after_seed(self):
        call_command('seed_canonical', stdout=StringIO())
        self.assertGreater(IngredientSubstitution.objects.count(), 0)

    def test_butter_to_olive_oil_pair_seeded(self):
        call_command('seed_canonical', stdout=StringIO())
        butter = Ingredient.objects.get(name='Butter')
        names = list(
            butter.outgoing_substitutions.values_list('to_ingredient__name', flat=True)
        )
        self.assertIn('Olive Oil', names)

    def test_at_least_five_ingredients_have_substitutes(self):
        # Acceptance criterion from issue #542.
        call_command('seed_canonical', stdout=StringIO())
        ingredients_with_subs = (
            Ingredient.objects
            .filter(
                is_approved=True,
                outgoing_substitutions__to_ingredient__is_approved=True,
            )
            .distinct()
            .count()
        )
        self.assertGreaterEqual(ingredients_with_subs, 5)

    def test_endpoint_returns_non_empty_for_seeded_pair(self):
        call_command('seed_canonical', stdout=StringIO())
        butter = Ingredient.objects.get(name='Butter')
        response = APIClient().get(f'/api/ingredients/{butter.id}/substitutes/')
        self.assertEqual(response.status_code, 200)
        # Migration 0010 defines Butter→Olive Oil for both flavor and texture.
        self.assertTrue(response.data['flavor'])
        self.assertTrue(response.data['texture'])

    def test_repopulates_after_truncate(self):
        # Simulate the bug: substitutions wiped after migrate but before seed.
        call_command('seed_canonical', stdout=StringIO())
        IngredientSubstitution.objects.all().delete()
        self.assertEqual(IngredientSubstitution.objects.count(), 0)

        call_command('seed_canonical', stdout=StringIO())
        self.assertGreater(IngredientSubstitution.objects.count(), 0)

    def test_idempotent_on_repeat_run(self):
        call_command('seed_canonical', stdout=StringIO())
        first_count = IngredientSubstitution.objects.count()
        call_command('seed_canonical', stdout=StringIO())
        second_count = IngredientSubstitution.objects.count()
        self.assertEqual(first_count, second_count)
