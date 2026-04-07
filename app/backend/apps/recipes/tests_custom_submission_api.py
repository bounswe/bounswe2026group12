from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Ingredient, Unit


User = get_user_model()


class CustomSubmissionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='submitter@example.com',
            username='submitter',
            password='SecurePass123!',
        )
        self.client.force_authenticate(user=self.user)

        self.ingredient_list_url = reverse('ingredient-list')
        self.unit_list_url = reverse('unit-list')

    def test_authenticated_user_can_submit_a_new_ingredient(self):
        response = self.client.post(self.ingredient_list_url, {'name': '  Smoked Paprika  '})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Smoked Paprika')
        self.assertFalse(response.data['is_approved'])

    def test_authenticated_user_can_submit_a_new_unit(self):
        response = self.client.post(self.unit_list_url, {'name': '  Pinch '})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Pinch')
        self.assertFalse(response.data['is_approved'])

    def test_ingredient_submission_rejects_blank_names(self):
        response = self.client.post(self.ingredient_list_url, {'name': '   '})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')

    def test_unit_submission_rejects_blank_names(self):
        response = self.client.post(self.unit_list_url, {'name': '   '})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')

    def test_ingredient_submission_rejects_case_insensitive_duplicates(self):
        Ingredient.objects.create(name='Salt', is_approved=True)

        response = self.client.post(self.ingredient_list_url, {'name': '  salt  '})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['name'][0], 'An ingredient with this name already exists.')

    def test_unit_submission_rejects_case_insensitive_duplicates(self):
        Unit.objects.create(name='Gram', is_approved=True)

        response = self.client.post(self.unit_list_url, {'name': ' gram '})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['name'][0], 'A unit with this name already exists.')
