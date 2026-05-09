"""Pure unit tests for apps.recipes.conversions.engine."""
from decimal import Decimal

from django.test import SimpleTestCase

from apps.recipes.conversions import ConversionError, convert


class SameDimensionTests(SimpleTestCase):
    def test_cup_to_ml_is_240(self):
        self.assertEqual(convert(1, 'cup', 'ml'), Decimal('240'))

    def test_ml_to_cup_round_trip(self):
        self.assertEqual(convert(240, 'ml', 'cup'), Decimal('1'))

    def test_litre_to_ml(self):
        self.assertEqual(convert(2, 'l', 'ml'), Decimal('2000'))

    def test_kg_to_g(self):
        self.assertEqual(convert(1, 'kg', 'g'), Decimal('1000'))

    def test_lb_to_g_uses_avoirdupois(self):
        self.assertEqual(convert(1, 'lb', 'g'), Decimal('453.59237'))

    def test_oz_to_g(self):
        self.assertEqual(convert(1, 'oz', 'g'), Decimal('28.349523125'))

    def test_lb_to_oz_is_16(self):
        self.assertEqual(convert(1, 'lb', 'oz'), Decimal('16'))

    def test_gallon_to_cup_is_16(self):
        self.assertEqual(convert(1, 'gallon', 'cup'), Decimal('16'))

    def test_tbsp_to_tsp_is_3(self):
        self.assertEqual(convert(1, 'tbsp', 'tsp'), Decimal('3'))

    def test_pinch_is_one_sixteenth_tsp(self):
        # 1 tsp / 16 = 0.3125 ml
        self.assertEqual(convert(1, 'pinch', 'ml'), Decimal('5') / Decimal('16'))
        self.assertEqual(convert(16, 'pinch', 'tsp'), Decimal('1'))

    def test_dash_is_one_eighth_tsp(self):
        self.assertEqual(convert(8, 'dash', 'tsp'), Decimal('1'))

    def test_smidgen_is_one_thirtysecond_tsp(self):
        self.assertEqual(convert(32, 'smidgen', 'tsp'), Decimal('1'))


class CrossDimensionTests(SimpleTestCase):
    def test_water_volume_to_mass(self):
        # density 1.0 g/ml => 240 ml = 240 g
        self.assertEqual(
            convert(240, 'ml', 'g', density_g_per_ml=Decimal('1.0')),
            Decimal('240.0'),
        )

    def test_water_mass_to_volume(self):
        self.assertEqual(
            convert(240, 'g', 'ml', density_g_per_ml=Decimal('1.0')),
            Decimal('240'),
        )

    def test_cup_to_grams_with_custom_density(self):
        # 1 cup = 240 ml. At 0.53 g/ml (flour), that's 127.2 g.
        self.assertEqual(
            convert(1, 'cup', 'g', density_g_per_ml=Decimal('0.53')),
            Decimal('127.20'),
        )

    def test_grams_to_cup_with_custom_density(self):
        # 240 g of substance at 1.0 g/ml -> 1 cup
        self.assertEqual(
            convert(240, 'g', 'cup', density_g_per_ml=Decimal('1.0')),
            Decimal('1'),
        )


class ErrorPathTests(SimpleTestCase):
    def test_missing_density_for_volume_to_mass(self):
        with self.assertRaises(ConversionError):
            convert(1, 'cup', 'g')

    def test_missing_density_for_mass_to_volume(self):
        with self.assertRaises(ConversionError):
            convert(100, 'g', 'cup')

    def test_unknown_from_unit(self):
        with self.assertRaises(ConversionError):
            convert(1, 'foobar', 'g')

    def test_unknown_to_unit(self):
        with self.assertRaises(ConversionError):
            convert(1, 'g', 'foobar')

    def test_negative_amount_rejected(self):
        with self.assertRaises(ConversionError):
            convert(-1, 'g', 'kg')

    def test_zero_density_rejected(self):
        with self.assertRaises(ConversionError):
            convert(1, 'cup', 'g', density_g_per_ml=Decimal('0'))

    def test_invalid_amount_string(self):
        with self.assertRaises(ConversionError):
            convert('not-a-number', 'g', 'kg')


class AliasTests(SimpleTestCase):
    def test_plural_and_case_insensitive(self):
        self.assertEqual(convert(1, 'Cups', 'ML'), Decimal('240'))
        self.assertEqual(convert(1, 'tablespoon', 'teaspoons'), Decimal('3'))
        self.assertEqual(convert(1, 'Pounds', 'grams'), Decimal('453.59237'))
