from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from .models import (
    Recipe, Region, Ingredient, Unit, RecipeIngredient,
    DietaryTag, EventTag,
)

User = get_user_model()


class RecipeFilterTestBase(APITestCase):
    """Shared fixture for rich-filter tests (M4-15 / #346)."""

    @classmethod
    def setUpTestData(cls):
        cls.author = User.objects.create_user(
            email='filter@example.com', username='filterauthor', password='Pass123!'
        )

        # Regions and lookup ingredients/units may be pre-seeded by data migrations;
        # use get_or_create so collisions are not an issue.
        cls.region_italian, _ = Region.objects.get_or_create(name='Italian')
        cls.region_mediterranean, _ = Region.objects.get_or_create(name='Mediterranean')
        cls.region_turkish, _ = Region.objects.get_or_create(name='Turkish')

        cls.ing_tomato, _ = Ingredient.objects.get_or_create(
            name='Tomato', defaults={'is_approved': True}
        )
        cls.ing_lamb, _ = Ingredient.objects.get_or_create(
            name='Lamb', defaults={'is_approved': True}
        )
        cls.ing_olive_oil, _ = Ingredient.objects.get_or_create(
            name='Olive Oil', defaults={'is_approved': True}
        )
        cls.ing_yogurt, _ = Ingredient.objects.get_or_create(
            name='Yogurt', defaults={'is_approved': True}
        )
        cls.unit_grams, _ = Unit.objects.get_or_create(
            name='grams', defaults={'is_approved': True}
        )

        cls.diet_vegan = DietaryTag.objects.create(name='Vegan', is_approved=True)
        cls.diet_vegetarian = DietaryTag.objects.create(name='Vegetarian', is_approved=True)
        cls.diet_halal = DietaryTag.objects.create(name='Halal', is_approved=True)

        cls.event_wedding = EventTag.objects.create(name='Wedding', is_approved=True)
        cls.event_ramadan = EventTag.objects.create(name='Ramadan', is_approved=True)
        cls.event_birthday = EventTag.objects.create(name='Birthday', is_approved=True)

        cls.recipe_a = cls._make_recipe(
            title='Pasta Pomodoro',
            region=cls.region_italian,
            ingredients=[cls.ing_tomato],
            diets=[cls.diet_vegan, cls.diet_vegetarian],
            events=[cls.event_wedding],
        )
        cls.recipe_b = cls._make_recipe(
            title='Lamb Tagine',
            region=cls.region_italian,
            ingredients=[cls.ing_lamb],
            diets=[cls.diet_halal],
            events=[cls.event_ramadan],
        )
        cls.recipe_c = cls._make_recipe(
            title='Olive Salad',
            region=cls.region_mediterranean,
            ingredients=[cls.ing_olive_oil],
            diets=[cls.diet_vegan],
            events=[cls.event_birthday],
        )
        cls.recipe_d = cls._make_recipe(
            title='Lamb Pilaf',
            region=cls.region_turkish,
            ingredients=[cls.ing_lamb, cls.ing_yogurt],
            diets=[cls.diet_halal],
            events=[cls.event_wedding],
        )

    @classmethod
    def _make_recipe(cls, title, region, ingredients, diets, events):
        recipe = Recipe.objects.create(
            title=title,
            description=f'Description for {title}',
            region=region,
            author=cls.author,
            is_published=True,
        )
        for ing in ingredients:
            RecipeIngredient.objects.create(
                recipe=recipe, ingredient=ing, amount=1, unit=cls.unit_grams,
            )
        recipe.dietary_tags.set(diets)
        recipe.event_tags.set(events)
        return recipe

    def _titles(self, response):
        results = response.data.get('results') if isinstance(response.data, dict) else response.data
        return sorted(r['title'] for r in results)


class RecipeListFilterTest(RecipeFilterTestBase):
    """GET /api/recipes/ rich filter axes."""

    URL = '/api/recipes/'

    def test_no_filters_returns_all(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 4)

    def test_region_positive_single(self):
        response = self.client.get(self.URL, {'region': 'Italian'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response), ['Lamb Tagine', 'Pasta Pomodoro'])

    def test_region_positive_multi_or(self):
        response = self.client.get(self.URL, {'region': 'Italian,Turkish'})
        self.assertEqual(self._titles(response), ['Lamb Pilaf', 'Lamb Tagine', 'Pasta Pomodoro'])

    def test_region_exclude(self):
        response = self.client.get(self.URL, {'region_exclude': 'Italian'})
        self.assertEqual(self._titles(response), ['Lamb Pilaf', 'Olive Salad'])

    def test_diet_positive(self):
        response = self.client.get(self.URL, {'diet': 'Vegan'})
        self.assertEqual(self._titles(response), ['Olive Salad', 'Pasta Pomodoro'])

    def test_diet_positive_multi_or(self):
        response = self.client.get(self.URL, {'diet': 'Vegan,Halal'})
        self.assertEqual(len(response.data['results']), 4)

    def test_diet_exclude(self):
        response = self.client.get(self.URL, {'diet_exclude': 'Vegan'})
        self.assertEqual(self._titles(response), ['Lamb Pilaf', 'Lamb Tagine'])

    def test_event_positive(self):
        response = self.client.get(self.URL, {'event': 'Wedding'})
        self.assertEqual(self._titles(response), ['Lamb Pilaf', 'Pasta Pomodoro'])

    def test_event_exclude(self):
        response = self.client.get(self.URL, {'event_exclude': 'Wedding'})
        self.assertEqual(self._titles(response), ['Lamb Tagine', 'Olive Salad'])

    def test_ingredient_positive(self):
        response = self.client.get(self.URL, {'ingredient': 'Lamb'})
        self.assertEqual(self._titles(response), ['Lamb Pilaf', 'Lamb Tagine'])

    def test_ingredient_exclude(self):
        response = self.client.get(self.URL, {'ingredient_exclude': 'Lamb'})
        self.assertEqual(self._titles(response), ['Olive Salad', 'Pasta Pomodoro'])

    def test_combined_axes_and_semantics(self):
        response = self.client.get(self.URL, {'diet': 'Vegan', 'region': 'Italian'})
        self.assertEqual(self._titles(response), ['Pasta Pomodoro'])

    def test_positive_and_negative_together(self):
        response = self.client.get(
            self.URL, {'event': 'Wedding', 'diet_exclude': 'Halal'}
        )
        self.assertEqual(self._titles(response), ['Pasta Pomodoro'])

    def test_filters_are_case_insensitive(self):
        response = self.client.get(self.URL, {'diet': 'vEgAn', 'region': 'italian'})
        self.assertEqual(self._titles(response), ['Pasta Pomodoro'])

    def test_no_duplicates_with_multi_match(self):
        # recipe_d has both Lamb and Yogurt; ingredient=Lamb,Yogurt should not duplicate
        response = self.client.get(self.URL, {'ingredient': 'Lamb,Yogurt'})
        titles = [r['title'] for r in response.data['results']]
        self.assertEqual(sorted(titles), ['Lamb Pilaf', 'Lamb Tagine'])
        self.assertEqual(len(titles), len(set(titles)))

    def test_unknown_axis_is_ignored(self):
        response = self.client.get(self.URL, {'nonsense': 'value'})
        self.assertEqual(len(response.data['results']), 4)

    def test_empty_csv_value_is_ignored(self):
        response = self.client.get(self.URL, {'diet': ',  ,'})
        self.assertEqual(len(response.data['results']), 4)

    def test_authenticated_list_includes_rank_fields_and_orders_matches_first(self):
        user = User.objects.create_user(
            email='ranked@example.com',
            username='ranked',
            password='Pass123!',
            regional_ties=['Turkish'],
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first = response.data['results'][0]
        self.assertEqual(first['title'], 'Lamb Pilaf')
        self.assertEqual(first['rank_reason'], 'regional_match')
        self.assertGreater(first['rank_score'], 0)


class SearchFilterTest(RecipeFilterTestBase):
    """GET /api/search/ inherits the same filter axes."""

    URL = '/api/search/'

    def test_search_supports_diet_filter(self):
        response = self.client.get(self.URL, {'diet': 'Vegan'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = sorted(r['title'] for r in response.data['recipes'])
        self.assertEqual(titles, ['Olive Salad', 'Pasta Pomodoro'])

    def test_search_supports_event_exclude(self):
        response = self.client.get(self.URL, {'event_exclude': 'Wedding'})
        titles = sorted(r['title'] for r in response.data['recipes'])
        self.assertEqual(titles, ['Lamb Tagine', 'Olive Salad'])

    def test_search_combines_q_with_diet(self):
        response = self.client.get(self.URL, {'q': 'Lamb', 'diet': 'Halal'})
        titles = sorted(r['title'] for r in response.data['recipes'])
        self.assertEqual(titles, ['Lamb Pilaf', 'Lamb Tagine'])


class TagLookupApiTest(APITestCase):
    """GET / POST /api/dietary-tags/ and /api/event-tags/ follow the moderated pattern."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email='tagger@example.com', username='tagger', password='Pass123!'
        )
        DietaryTag.objects.create(name='ApprovedDiet', is_approved=True)
        DietaryTag.objects.create(name='PendingDiet', is_approved=False)
        EventTag.objects.create(name='ApprovedEvent', is_approved=True)
        EventTag.objects.create(name='PendingEvent', is_approved=False)

    def test_dietary_tags_list_returns_only_approved(self):
        response = self.client.get('/api/dietary-tags/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [t['name'] for t in response.data]
        self.assertIn('ApprovedDiet', names)
        self.assertNotIn('PendingDiet', names)

    def test_event_tags_list_returns_only_approved(self):
        response = self.client.get('/api/event-tags/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [t['name'] for t in response.data]
        self.assertIn('ApprovedEvent', names)
        self.assertNotIn('PendingEvent', names)

    def test_post_dietary_tag_requires_auth(self):
        response = self.client.post('/api/dietary-tags/', {'name': 'NewDiet'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_dietary_tag_creates_unapproved(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/dietary-tags/', {'name': 'NewDiet'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tag = DietaryTag.objects.get(name='NewDiet')
        self.assertFalse(tag.is_approved)

    def test_post_dietary_tag_rejects_duplicate(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/dietary-tags/', {'name': 'approveddiet'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RecipeSerializerTagWriteTest(APITestCase):
    """RecipeSerializer accepts dietary_tag_ids and event_tag_ids on create/update."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email='owner@example.com', username='owner', password='Pass123!'
        )
        cls.region, _ = Region.objects.get_or_create(name='Italian')
        cls.ing, _ = Ingredient.objects.get_or_create(
            name='Tomato', defaults={'is_approved': True}
        )
        cls.unit, _ = Unit.objects.get_or_create(
            name='grams', defaults={'is_approved': True}
        )
        cls.diet = DietaryTag.objects.create(name='Vegan', is_approved=True)
        cls.event = EventTag.objects.create(name='Wedding', is_approved=True)

    def test_create_recipe_with_tag_ids(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'title': 'Tagged Recipe',
            'description': 'A recipe with tags.',
            'region': self.region.id,
            'ingredients_write': [{'ingredient': self.ing.id, 'amount': '1.00', 'unit': self.unit.id}],
            'dietary_tag_ids': [self.diet.id],
            'event_tag_ids': [self.event.id],
        }
        response = self.client.post('/api/recipes/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        recipe = Recipe.objects.get(id=response.data['id'])
        self.assertEqual(list(recipe.dietary_tags.values_list('name', flat=True)), ['Vegan'])
        self.assertEqual(list(recipe.event_tags.values_list('name', flat=True)), ['Wedding'])

    def test_response_exposes_tag_objects(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'title': 'Tag Response',
            'description': '...',
            'region': self.region.id,
            'ingredients_write': [{'ingredient': self.ing.id, 'amount': '1.00', 'unit': self.unit.id}],
            'dietary_tag_ids': [self.diet.id],
        }
        response = self.client.post('/api/recipes/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['dietary_tags'], [{'id': self.diet.id, 'name': 'Vegan'}])
        self.assertEqual(response.data['event_tags'], [])
