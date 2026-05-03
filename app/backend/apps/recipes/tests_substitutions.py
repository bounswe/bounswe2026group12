from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase

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
