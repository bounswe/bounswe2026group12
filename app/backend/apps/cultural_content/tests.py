from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CulturalContent

User = get_user_model()

URL = '/api/cultural-content/daily/'


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
