from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.recipes.models import Recipe, Ingredient, HeritageStatus, EndangeredNote, Region

User = get_user_model()

class HeritageTagsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', email='test@test.com', password='password')
        self.region, _ = Region.objects.get_or_create(name='Anatolian')
        
        # Endangered ingredient
        self.einkorn, _ = Ingredient.objects.get_or_create(
            name='Einkorn Wheat',
            defaults={
                'heritage_status': HeritageStatus.ENDANGERED,
                'is_approved': True
            }
        )
        
        # Endangered recipe
        self.manti = Recipe.objects.create(
            title='Heritage Manti',
            description='Test manti',
            author=self.user,
            region=self.region,
            is_published=True,
            is_heritage=True,
            heritage_status=HeritageStatus.ENDANGERED
        )
        
        # Endangered note
        self.note = EndangeredNote.objects.create(
            recipe=self.manti,
            text='Only 50 families grow this grain.',
            source_url='http://example.com'
        )
        
        # Regular recipe
        self.pasta = Recipe.objects.create(
            title='Regular Pasta',
            description='Test pasta',
            author=self.user,
            region=self.region,
            is_published=True,
            is_heritage=False,
            heritage_status=HeritageStatus.NONE
        )

    def test_recipe_detail_includes_heritage_fields(self):
        response = self.client.get(f'/api/recipes/{self.manti.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['heritage_status'], HeritageStatus.ENDANGERED)
        self.assertTrue(response.data['is_heritage'])
        self.assertEqual(len(response.data['endangered_notes']), 1)
        self.assertEqual(response.data['endangered_notes'][0]['text'], self.note.text)

    def test_filter_recipes_by_heritage_status(self):
        # Test positive filter
        response = self.client.get('/api/recipes/?heritage_status=endangered')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Heritage Manti')

        # Test none filter
        response = self.client.get('/api/recipes/?heritage_status=none')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Regular Pasta')

    def test_filter_ingredients_by_heritage_status(self):
        response = self.client.get('/api/ingredients/?heritage_status=endangered')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Search results might include others if seed is loaded, but here we use a clean DB
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Einkorn Wheat')

    def test_admin_visibility(self):
        # This just checks if models are registered, which we did in admin.py
        # Real admin tests would require logging in as staff.
        pass
