from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Ingredient, IngredientSubstitution


class IngredientSubstitutionModelTests(TestCase):
    """Database-level invariants enforced by the IngredientSubstitution model."""

    @classmethod
    def setUpTestData(cls):
        cls.butter = Ingredient.objects.create(name='Butter-test', is_approved=True)
        cls.olive_oil = Ingredient.objects.create(name='Olive Oil-test', is_approved=True)

    def test_self_loop_is_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                IngredientSubstitution.objects.create(
                    from_ingredient=self.butter,
                    to_ingredient=self.butter,
                    match_type=IngredientSubstitution.MatchType.FLAVOR,
                    closeness=Decimal('0.5'),
                )

    def test_closeness_above_one_is_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                IngredientSubstitution.objects.create(
                    from_ingredient=self.butter,
                    to_ingredient=self.olive_oil,
                    match_type=IngredientSubstitution.MatchType.FLAVOR,
                    closeness=Decimal('1.5'),
                )

    def test_closeness_below_zero_is_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                IngredientSubstitution.objects.create(
                    from_ingredient=self.butter,
                    to_ingredient=self.olive_oil,
                    match_type=IngredientSubstitution.MatchType.FLAVOR,
                    closeness=Decimal('-0.1'),
                )

    def test_unique_pair_match_type_is_enforced(self):
        IngredientSubstitution.objects.create(
            from_ingredient=self.butter,
            to_ingredient=self.olive_oil,
            match_type=IngredientSubstitution.MatchType.FLAVOR,
            closeness=Decimal('0.7'),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                IngredientSubstitution.objects.create(
                    from_ingredient=self.butter,
                    to_ingredient=self.olive_oil,
                    match_type=IngredientSubstitution.MatchType.FLAVOR,
                    closeness=Decimal('0.5'),
                )

    def test_same_pair_with_different_match_types_is_allowed(self):
        IngredientSubstitution.objects.create(
            from_ingredient=self.butter,
            to_ingredient=self.olive_oil,
            match_type=IngredientSubstitution.MatchType.FLAVOR,
            closeness=Decimal('0.7'),
        )
        IngredientSubstitution.objects.create(
            from_ingredient=self.butter,
            to_ingredient=self.olive_oil,
            match_type=IngredientSubstitution.MatchType.TEXTURE,
            closeness=Decimal('0.6'),
        )
        self.assertEqual(
            IngredientSubstitution.objects.filter(
                from_ingredient=self.butter, to_ingredient=self.olive_oil,
            ).count(),
            2,
        )

    def test_reverse_direction_is_a_separate_row(self):
        IngredientSubstitution.objects.create(
            from_ingredient=self.butter,
            to_ingredient=self.olive_oil,
            match_type=IngredientSubstitution.MatchType.FLAVOR,
            closeness=Decimal('0.7'),
        )
        IngredientSubstitution.objects.create(
            from_ingredient=self.olive_oil,
            to_ingredient=self.butter,
            match_type=IngredientSubstitution.MatchType.FLAVOR,
            closeness=Decimal('0.65'),
        )
        self.assertEqual(
            IngredientSubstitution.objects.filter(
                from_ingredient__in=[self.butter, self.olive_oil],
                to_ingredient__in=[self.butter, self.olive_oil],
            ).count(),
            2,
        )


class SubstitutionSeedTests(TestCase):
    """The seed migration must populate a known anchor pair."""

    def test_butter_to_olive_oil_flavor_pair_seeded(self):
        pair = IngredientSubstitution.objects.filter(
            from_ingredient__name='Butter',
            to_ingredient__name='Olive Oil',
            match_type=IngredientSubstitution.MatchType.FLAVOR,
        ).first()
        self.assertIsNotNone(pair, 'Seed migration should populate Butter→Olive Oil (flavor)')
        self.assertEqual(pair.closeness, Decimal('0.70'))
        self.assertIn('75% volume', pair.notes)

    def test_seed_count_is_in_expected_range(self):
        count = IngredientSubstitution.objects.count()
        self.assertGreaterEqual(count, 40, 'Expected at least 40 seeded substitutions')
        self.assertLessEqual(count, 60, 'Seed should be focused, not exhaustive')


class SubstitutionApiTests(APITestCase):
    """GET /api/ingredients/{id}/substitutes/ contract."""

    @classmethod
    def setUpTestData(cls):
        cls.butter = Ingredient.objects.create(name='Butter-api', is_approved=True)
        cls.olive_oil = Ingredient.objects.create(name='Olive Oil-api', is_approved=True)
        cls.cream = Ingredient.objects.create(name='Cream-api', is_approved=True)
        cls.unapproved = Ingredient.objects.create(name='Unapproved-api', is_approved=False)

        # Two flavor matches with distinct closeness, plus one unapproved target
        IngredientSubstitution.objects.create(
            from_ingredient=cls.butter, to_ingredient=cls.olive_oil,
            match_type=IngredientSubstitution.MatchType.FLAVOR, closeness=Decimal('0.70'),
            notes='Use less',
        )
        IngredientSubstitution.objects.create(
            from_ingredient=cls.butter, to_ingredient=cls.cream,
            match_type=IngredientSubstitution.MatchType.FLAVOR, closeness=Decimal('0.85'),
            notes='',
        )
        IngredientSubstitution.objects.create(
            from_ingredient=cls.butter, to_ingredient=cls.olive_oil,
            match_type=IngredientSubstitution.MatchType.TEXTURE, closeness=Decimal('0.60'),
            notes='',
        )
        IngredientSubstitution.objects.create(
            from_ingredient=cls.butter, to_ingredient=cls.unapproved,
            match_type=IngredientSubstitution.MatchType.FLAVOR, closeness=Decimal('0.99'),
            notes='Should be filtered',
        )

    def url(self, pk):
        return f'/api/ingredients/{pk}/substitutes/'

    def test_returns_three_categories_always(self):
        response = self.client.get(self.url(self.butter.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('flavor', response.data)
        self.assertIn('texture', response.data)
        self.assertIn('chemical', response.data)
        self.assertEqual(response.data['chemical'], [])

    def test_results_ordered_by_closeness_desc(self):
        response = self.client.get(self.url(self.butter.id))
        flavor = response.data['flavor']
        self.assertEqual(len(flavor), 2)
        self.assertEqual(flavor[0]['name'], 'Cream-api')   # 0.85
        self.assertEqual(flavor[1]['name'], 'Olive Oil-api')  # 0.70

    def test_unapproved_targets_are_filtered(self):
        response = self.client.get(self.url(self.butter.id))
        flavor_names = [row['name'] for row in response.data['flavor']]
        self.assertNotIn('Unapproved-api', flavor_names)

    def test_response_includes_source_ingredient(self):
        response = self.client.get(self.url(self.butter.id))
        self.assertEqual(response.data['ingredient'], {'id': self.butter.id, 'name': 'Butter-api'})

    def test_404_for_unknown_ingredient(self):
        response = self.client.get(self.url(999999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_404_for_unapproved_source(self):
        response = self.client.get(self.url(self.unapproved.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_access_is_allowed(self):
        # Explicit: no auth header. Must not 401/403.
        response = self.client.get(self.url(self.butter.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_closeness_serialized_as_decimal_string(self):
        response = self.client.get(self.url(self.butter.id))
        first = response.data['flavor'][0]
        # DRF DecimalField renders as a string by default to preserve precision.
        self.assertEqual(str(first['closeness']), '0.85')
