from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Recipe, Region

from .models import CulturalContent, CulturalEvent, CulturalEventRecipe

User = get_user_model()

URL = '/api/cultural-content/daily/'
EVENTS_URL = '/api/cultural-events/'
EVENT_RECIPES_URL = '/api/cultural-event-recipes/'


class DailyCulturalContentTest(APITestCase):
    """Tests for GET /api/cultural-content/daily/ (M4-17 / #348)."""

    @classmethod
    def setUpTestData(cls):
        cls.aegean_item = CulturalContent.objects.create(
            slug='aegean-tradition',
            kind=CulturalContent.Kind.TRADITION,
            title='Aegean Tradition',
            body='An Aegean breakfast custom.',
            region_text='Aegean',
            link_kind=CulturalContent.LinkKind.STORY,
            link_id=2,
            cultural_tags=['Aegean', 'Turkish'],
        )
        cls.levantine_item = CulturalContent.objects.create(
            slug='levantine-dish',
            kind=CulturalContent.Kind.DISH,
            title='Levantine Dish',
            body='A festive Levantine recipe.',
            region_text='Levantine',
            link_kind=CulturalContent.LinkKind.RECIPE,
            link_id=12,
            cultural_tags=['Levantine', 'Halal', 'Wedding'],
        )
        cls.untagged_item = CulturalContent.objects.create(
            slug='untagged-fact',
            kind=CulturalContent.Kind.FACT,
            title='An Untagged Fact',
            body='Body without region or link.',
            cultural_tags=[],
        )
        cls.inactive_item = CulturalContent.objects.create(
            slug='inactive-holiday',
            kind=CulturalContent.Kind.HOLIDAY,
            title='Inactive Holiday',
            body='Should never be returned.',
            is_active=False,
            cultural_tags=['Aegean'],
        )

    def test_anonymous_returns_active_items_only(self):
        response = self.client.get(URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item['id'] for item in response.data]
        self.assertEqual(len(response.data), 3)
        for item in response.data:
            self.assertNotIn('Inactive', item['title'])

    def test_response_shape_matches_card_contract(self):
        response = self.client.get(URL)
        item = next(i for i in response.data if i['title'] == 'Levantine Dish')
        self.assertEqual(item['id'], f'dc-dish-{self.levantine_item.id}')
        self.assertEqual(item['kind'], 'dish')
        self.assertEqual(item['region'], 'Levantine')
        self.assertEqual(item['link'], {'kind': 'recipe', 'id': 12})
        self.assertNotIn('cultural_tags', item)

    def test_optional_fields_omitted_when_empty(self):
        response = self.client.get(URL)
        item = next(i for i in response.data if i['title'] == 'An Untagged Fact')
        self.assertNotIn('region', item)
        self.assertNotIn('link', item)

    def test_authenticated_user_with_overlapping_tags_ranks_first(self):
        user = User.objects.create_user(
            email='wedding@example.com', username='weddingfan', password='Pass123!',
            cultural_interests=['Halal'],
            event_interests=['Wedding'],
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(URL)
        self.assertEqual(response.data[0]['title'], 'Levantine Dish')

    def test_authenticated_user_with_no_profile_falls_back_to_recency(self):
        user = User.objects.create_user(
            email='no-profile@example.com', username='noprofile', password='Pass123!',
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(URL)
        self.assertEqual(response.data[0]['title'], 'An Untagged Fact')

    def test_personalization_is_case_insensitive(self):
        user = User.objects.create_user(
            email='aegean@example.com', username='aegeanfan', password='Pass123!',
            regional_ties=['aegean'],
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(URL)
        self.assertEqual(response.data[0]['title'], 'Aegean Tradition')

    def test_limit_is_capped(self):
        # Create 10 more active items so total > DAILY_LIMIT (8)
        for i in range(10):
            CulturalContent.objects.create(
                slug=f'extra-{i}', kind=CulturalContent.Kind.FACT,
                title=f'Extra {i}', body='...',
            )
        response = self.client.get(URL)
        self.assertLessEqual(len(response.data), 8)

    def test_empty_table_returns_empty_list(self):
        CulturalContent.objects.all().delete()
        response = self.client.get(URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_endpoint_is_public(self):
        response = self.client.get(URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SeedCulturalContentCommandTest(APITestCase):
    """Tests for the seed_cultural_content management command (M4-17 / #348)."""

    def test_command_creates_seed_items(self):
        call_command('seed_cultural_content')
        self.assertGreaterEqual(CulturalContent.objects.count(), 5)

    def test_command_is_idempotent(self):
        call_command('seed_cultural_content')
        first_count = CulturalContent.objects.count()
        call_command('seed_cultural_content')
        self.assertEqual(CulturalContent.objects.count(), first_count)

    def test_seeded_items_appear_in_endpoint(self):
        call_command('seed_cultural_content')
        response = self.client.get(URL)
        titles = [item['title'] for item in response.data]
        self.assertIn('Sunday Börek Mornings', titles)


class CulturalEventModelTests(APITestCase):
    """Model-level checks for CulturalEvent and CulturalEventRecipe (#528)."""

    @classmethod
    def setUpTestData(cls):
        cls.author = User.objects.create_user(
            email='curator@example.com', username='curator', password='Pass123!',
        )
        cls.region, _ = Region.objects.get_or_create(name='Test Region Alpha')
        cls.region.is_approved = True
        cls.region.save(update_fields=['is_approved'])
        cls.event = CulturalEvent.objects.create(
            name='Nevruz',
            date_rule='fixed:03-21',
            region=cls.region,
            description='Spring equinox celebration.',
        )
        cls.recipe = Recipe.objects.create(
            title='Sumalak', description='Sprouted wheat pudding.', author=cls.author,
        )

    def test_junction_creates_and_reverse_traversal_works(self):
        link = CulturalEventRecipe.objects.create(event=self.event, recipe=self.recipe)
        self.assertIn(link, self.event.event_recipes.all())
        self.assertIn(link, self.recipe.cultural_event_links.all())
        self.assertEqual(link.event, self.event)
        self.assertEqual(link.recipe, self.recipe)

    def test_junction_uniqueness_at_db_level(self):
        CulturalEventRecipe.objects.create(event=self.event, recipe=self.recipe)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CulturalEventRecipe.objects.create(
                    event=self.event, recipe=self.recipe,
                )

    def test_region_set_null_on_delete(self):
        self.region.delete()
        self.event.refresh_from_db()
        self.assertIsNone(self.event.region)


class CulturalEventAPITests(APITestCase):
    """API surface for CulturalEvent: list, detail, filters, permissions (#528)."""

    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user(
            email='staff@example.com', username='staff', password='Pass123!',
            is_staff=True,
        )
        cls.regular = User.objects.create_user(
            email='reader@example.com', username='reader', password='Pass123!',
        )
        cls.aegean, _ = Region.objects.get_or_create(name='Test Region Aegean')
        cls.anatolia, _ = Region.objects.get_or_create(name='Test Region Anatolia')
        Region.objects.filter(pk__in=[cls.aegean.pk, cls.anatolia.pk]).update(
            is_approved=True,
        )

        cls.nevruz = CulturalEvent.objects.create(
            name='Nevruz', date_rule='fixed:03-21', region=cls.anatolia,
            description='Spring equinox.',
        )
        cls.hidirellez = CulturalEvent.objects.create(
            name='Hidirellez', date_rule='fixed:05-06', region=cls.aegean,
        )
        cls.ramadan = CulturalEvent.objects.create(
            name='Ramadan', date_rule='lunar:ramadan', region=cls.anatolia,
        )

        cls.recipe = Recipe.objects.create(
            title='Sumalak', description='Spring pudding.', author=cls.staff,
        )
        CulturalEventRecipe.objects.create(event=cls.nevruz, recipe=cls.recipe)

    def _results(self, response):
        data = response.data
        return data['results'] if isinstance(data, dict) and 'results' in data else data

    def test_list_returns_events_for_anonymous(self):
        response = self.client.get(EVENTS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._results(response)
        names = {item['name'] for item in results}
        self.assertEqual(names, {'Nevruz', 'Hidirellez', 'Ramadan'})

    def test_detail_includes_nested_recipes(self):
        response = self.client.get(f'{EVENTS_URL}{self.nevruz.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Nevruz')
        self.assertEqual(response.data['region']['name'], 'Test Region Anatolia')
        recipe_titles = [r['title'] for r in response.data['recipes']]
        self.assertEqual(recipe_titles, ['Sumalak'])

    def test_month_filter_returns_matching_fixed_and_all_lunar(self):
        response = self.client.get(f'{EVENTS_URL}?month=03')
        results = self._results(response)
        names = {item['name'] for item in results}
        # March fixed event + every lunar event (frontend resolves the date)
        self.assertEqual(names, {'Nevruz', 'Ramadan'})

    def test_month_filter_excludes_other_months(self):
        response = self.client.get(f'{EVENTS_URL}?month=05')
        results = self._results(response)
        names = {item['name'] for item in results}
        # Hidirellez (May) + every lunar event
        self.assertEqual(names, {'Hidirellez', 'Ramadan'})

    def test_region_filter(self):
        response = self.client.get(f'{EVENTS_URL}?region={self.aegean.id}')
        results = self._results(response)
        names = {item['name'] for item in results}
        self.assertEqual(names, {'Hidirellez'})

    def test_anonymous_cannot_create(self):
        response = self.client.post(EVENTS_URL, {
            'name': 'Anonymous Attempt', 'date_rule': 'fixed:01-01',
        }, format='json')
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_regular_user_cannot_create(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.post(EVENTS_URL, {
            'name': 'Should Fail', 'date_rule': 'fixed:01-01',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_create(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(EVENTS_URL, {
            'name': 'Asure Day', 'date_rule': 'fixed:10-01',
            'region_id': self.anatolia.id,
            'description': 'Ten ingredients pudding.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CulturalEvent.objects.filter(name='Asure Day').exists())


class CulturalEventRecipeJunctionAPITests(APITestCase):
    """CRUD checks for the CulturalEventRecipe junction (#528)."""

    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user(
            email='staff@example.com', username='staff', password='Pass123!',
            is_staff=True,
        )
        cls.regular = User.objects.create_user(
            email='reader@example.com', username='reader', password='Pass123!',
        )
        cls.event = CulturalEvent.objects.create(
            name='Nevruz', date_rule='fixed:03-21',
        )
        cls.recipe = Recipe.objects.create(
            title='Sumalak', description='Spring pudding.', author=cls.staff,
        )

    def test_staff_can_create_link(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(EVENT_RECIPES_URL, {
            'event_id': self.event.id, 'recipe_id': self.recipe.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CulturalEventRecipe.objects.count(), 1)

    def test_regular_user_cannot_create_link(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.post(EVENT_RECIPES_URL, {
            'event_id': self.event.id, 'recipe_id': self.recipe.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_link_rejected(self):
        CulturalEventRecipe.objects.create(event=self.event, recipe=self.recipe)
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(EVENT_RECIPES_URL, {
            'event_id': self.event.id, 'recipe_id': self.recipe.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_delete_link(self):
        link = CulturalEventRecipe.objects.create(event=self.event, recipe=self.recipe)
        self.client.force_authenticate(user=self.staff)
        response = self.client.delete(f'{EVENT_RECIPES_URL}{link.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CulturalEventRecipe.objects.filter(id=link.id).exists())

    def test_anonymous_can_list_links(self):
        CulturalEventRecipe.objects.create(event=self.event, recipe=self.recipe)
        response = self.client.get(EVENT_RECIPES_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
