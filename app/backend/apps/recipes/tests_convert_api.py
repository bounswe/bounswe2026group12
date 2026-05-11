"""Tests for POST /api/convert/."""
import json
from decimal import Decimal

from django.test import Client
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Ingredient


class ConvertApiTests(APITestCase):
    def setUp(self):
        self.url = reverse('convert')
        # The recipes app ships seed migrations that pre-create common
        # ingredient names (issue #419). Use get_or_create to stay idempotent
        # against that and force the density to the value this test expects.
        self.flour, _ = Ingredient.objects.get_or_create(
            name='Flour', defaults={'is_approved': True, 'density_g_per_ml': Decimal('0.5300')},
        )
        self.flour.density_g_per_ml = Decimal('0.5300')
        self.flour.save(update_fields=['density_g_per_ml'])

        self.unpriced, _ = Ingredient.objects.get_or_create(
            name='Test Mystery Powder', defaults={'is_approved': True, 'density_g_per_ml': None},
        )
        self.unpriced.density_g_per_ml = None
        self.unpriced.save(update_fields=['density_g_per_ml'])

    def test_same_dimension_conversion_does_not_need_ingredient(self):
        response = self.client.post(self.url, {
            'amount': '1',
            'from_unit': 'cup',
            'to_unit': 'ml',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['from_unit'], 'cup')
        self.assertEqual(response.data['to_unit'], 'ml')
        self.assertEqual(Decimal(response.data['amount']), Decimal('240'))
        self.assertIsNone(response.data['ingredient_id'])

    def test_mass_to_volume_with_ingredient_density(self):
        response = self.client.post(self.url, {
            'amount': '1',
            'from_unit': 'cup',
            'to_unit': 'g',
            'ingredient_id': self.flour.id,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 1 cup = 240 ml * 0.53 = 127.2 g
        self.assertEqual(Decimal(response.data['amount']), Decimal('127.2'))
        self.assertEqual(response.data['ingredient_id'], self.flour.id)

    def test_missing_density_returns_400(self):
        response = self.client.post(self.url, {
            'amount': '1',
            'from_unit': 'cup',
            'to_unit': 'g',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('density', response.data['detail'].lower())

    def test_ingredient_without_density_returns_400(self):
        response = self.client.post(self.url, {
            'amount': '1',
            'from_unit': 'cup',
            'to_unit': 'g',
            'ingredient_id': self.unpriced.id,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('density', response.data['detail'].lower())

    def test_unknown_unit_returns_400(self):
        response = self.client.post(self.url, {
            'amount': '1',
            'from_unit': 'foobar',
            'to_unit': 'g',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('foobar', response.data['detail'])

    def test_invalid_amount_returns_400(self):
        response = self.client.post(self.url, {
            'amount': 'not-a-number',
            'from_unit': 'g',
            'to_unit': 'kg',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', response.data)

    def test_negative_amount_rejected(self):
        response = self.client.post(self.url, {
            'amount': '-5',
            'from_unit': 'g',
            'to_unit': 'kg',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_ingredient_id_returns_400(self):
        response = self.client.post(self.url, {
            'amount': '1',
            'from_unit': 'cup',
            'to_unit': 'g',
            'ingredient_id': 999999,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('999999', response.data['detail'])

    def test_endpoint_is_public(self):
        # No auth header in setUp; same-dim conversion already passed.
        # This test just makes the contract explicit.
        response = self.client.post(self.url, {
            'amount': '500',
            'from_unit': 'g',
            'to_unit': 'kg',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['amount']), Decimal('0.5'))

    def test_convert_allows_anonymous(self):
        # Regression for #503. APIClient sets request._force_auth_user even
        # when no force_authenticate() is called, which makes the custom
        # JWTAuthenticationMiddleware short-circuit and skip its 401 enforcement
        # branch. Use the plain django.test.Client so the middleware runs the
        # same path it does in production for a logged-out browser.
        plain_client = Client()
        response = plain_client.post(
            self.url,
            data=json.dumps({
                'amount': '100',
                'from_unit': 'g',
                'to_unit': 'oz',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body['from_unit'], 'g')
        self.assertEqual(body['to_unit'], 'oz')
        self.assertEqual(Decimal(body['amount']), Decimal('3.5274'))
