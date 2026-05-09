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
        """TC_API_ING_003 - Ingredient submission half (pending state).

        Designer: Ahmet Ayberk Durak. Lab 9 acceptance test.
        Requirements: 3.7.4, 4.4.2.

        The full pending-then-approved flow is covered by
        test_ingredient_pending_then_approved_flow below.
        """
        response = self.client.post(self.ingredient_list_url, {'name': '  Smoked Paprika  '})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Smoked Paprika')
        self.assertFalse(response.data['is_approved'])

    def test_ingredient_pending_then_approved_flow(self):
        """TC_API_ING_003 - Full ingredient moderation flow.

        Designer: Ahmet Ayberk Durak. Lab 9 acceptance test.
        Requirements: 3.7.4, 4.4.2.

        Walks the full flow end-to-end:
        1) regular user submits an ingredient (lands is_approved=False, hidden
           from the public list);
        2) admin PATCHes is_approved=True via the IngredientViewSet
           ModeratedLookupViewSet admin-write path;
        3) the ingredient is now visible in the public list.
        """
        admin = User.objects.create_superuser(
            email='admin-ing@example.com',
            username='admin-ing',
            password='AdminPass123!',
        )

        submit = self.client.post(
            self.ingredient_list_url, {'name': 'Lab9 Sumac'}
        )
        self.assertEqual(submit.status_code, status.HTTP_201_CREATED)
        ingredient_id = submit.data['id']
        self.assertFalse(submit.data['is_approved'])

        anon_client = self.client_class()
        pending_list = anon_client.get(self.ingredient_list_url)
        self.assertEqual(pending_list.status_code, status.HTTP_200_OK)
        pending_results = pending_list.data
        if isinstance(pending_results, dict):
            pending_results = pending_results.get('results', [])
        self.assertNotIn(
            'Lab9 Sumac', [item['name'] for item in pending_results]
        )

        self.client.force_authenticate(user=admin)
        approve = self.client.patch(
            f'{self.ingredient_list_url}{ingredient_id}/',
            {'is_approved': True},
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        self.assertTrue(approve.data['is_approved'])

        self.client.force_authenticate(user=self.user)
        public_list = anon_client.get(self.ingredient_list_url)
        self.assertEqual(public_list.status_code, status.HTTP_200_OK)
        public_results = public_list.data
        if isinstance(public_results, dict):
            public_results = public_results.get('results', [])
        self.assertIn(
            'Lab9 Sumac', [item['name'] for item in public_results]
        )

    def test_authenticated_user_can_submit_a_new_unit(self):
        response = self.client.post(self.unit_list_url, {'name': '  TestUnit-zeta '})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'TestUnit-zeta')
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
        Ingredient.objects.create(name='TestIngredient-omega', is_approved=True)

        response = self.client.post(self.ingredient_list_url, {'name': '  testingredient-omega  '})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['name'][0], 'An ingredient with this name already exists.')

    def test_unit_submission_rejects_case_insensitive_duplicates(self):
        Unit.objects.create(name='Gram', is_approved=True)

        response = self.client.post(self.unit_list_url, {'name': ' gram '})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['name'][0], 'A unit with this name already exists.')
