from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

User = get_user_model()

class MealAndStoryTypeFilterTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.author = User.objects.create_user(
            email='filter@example.com', username='filterauthor', password='Pass123!'
        )
        cls.region = Region.objects.create(name='Global', is_approved=True)

        # Recipes
        cls.soup = Recipe.objects.create(
            title='Lentil Soup',
            description='Warm soup',
            region=cls.region,
            author=cls.author,
            is_published=True,
            meal_type=Recipe.MealType.SOUP
        )
        cls.dessert = Recipe.objects.create(
            title='Baklava',
            description='Sweet dessert',
            region=cls.region,
            author=cls.author,
            is_published=True,
            meal_type=Recipe.MealType.DESSERT
        )
        cls.untyped_recipe = Recipe.objects.create(
            title='Water',
            description='Just water',
            region=cls.region,
            author=cls.author,
            is_published=True,
            meal_type=""
        )

        # Stories
        cls.family_story = Story.objects.create(
            title='Family Traditions',
            body='Our family recipe...',
            author=cls.author,
            is_published=True,
            story_type=Story.StoryType.FAMILY
        )
        cls.festive_story = Story.objects.create(
            title='Festival Food',
            body='Celebrating with food...',
            author=cls.author,
            is_published=True,
            story_type=Story.StoryType.FESTIVE
        )

    def test_recipe_list_meal_type_filter(self):
        url = '/api/recipes/'
        
        # Filter for soup
        response = self.client.get(url, {'meal_type': 'soup'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Lentil Soup')

        # Filter for dessert
        response = self.client.get(url, {'meal_type': 'dessert'})
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Baklava')

        # Invalid meal type should return no recipes (strict validation in my implementation)
        # Re-reading issue: "an unknown value just no-ops rather than 400s"
        # In my code:
        # if meal_type in {c for c, _ in Recipe.MealType.choices}:
        #     qs = qs.filter(meal_type=meal_type)
        # else:
        #     qs = qs.none()
        # Wait, if it returns none, it's NOT no-op in the sense of "ignore filter".
        # Usually no-op means "do nothing" (don't apply filter).
        # Let's check how story_type behaved before.
        # It was:
        # if story_type in valid_values:
        #     qs = qs.filter(story_type=story_type)
        # else:
        #     qs = qs.none()
        # So "matching how the existing story list endpoint behaves" means returning empty.
        
        response = self.client.get(url, {'meal_type': 'nonsense'})
        self.assertEqual(len(response.data['results']), 0)

    def test_search_meal_type_filter(self):
        url = reverse('global_search')
        
        # Filter for soup
        response = self.client.get(url, {'meal_type': 'soup'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recipes']), 1)
        self.assertEqual(response.data['recipes'][0]['title'], 'Lentil Soup')
        # Stories should be unaffected
        self.assertEqual(len(response.data['stories']), 2)

    def test_search_story_type_filter(self):
        url = reverse('global_search')
        
        # Filter for family stories
        response = self.client.get(url, {'story_type': 'family'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['stories']), 1)
        self.assertEqual(response.data['stories'][0]['title'], 'Family Traditions')
        # Recipes should be unaffected
        self.assertEqual(len(response.data['recipes']), 3)

    def test_serializer_exposes_meal_type(self):
        url = f'/api/recipes/{self.soup.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['meal_type'], 'soup')

    def test_can_set_meal_type_on_create(self):
        self.client.force_authenticate(user=self.author)
        url = '/api/recipes/'
        payload = {
            'title': 'New Snack',
            'description': 'Crunchy snack',
            'region': self.region.id,
            'meal_type': 'snack',
            'ingredients_write': [
                {'ingredient': 1, 'amount': '100', 'unit': 1} # Assuming IDs exist or Mocking
            ]
        }
        # I'll just use an existing ingredient from database or create one
        from apps.recipes.models import Ingredient, Unit
        ing = Ingredient.objects.create(name='Test Ing', is_approved=True)
        unit = Unit.objects.create(name='Test Unit', is_approved=True)
        payload['ingredients_write'][0]['ingredient'] = ing.id
        payload['ingredients_write'][0]['unit'] = unit.id
        
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['meal_type'], 'snack')
        
        recipe = Recipe.objects.get(id=response.data['id'])
        self.assertEqual(recipe.meal_type, 'snack')
