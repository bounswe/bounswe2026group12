from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Region

from .models import CulturalFact, HeritageGroup


User = get_user_model()


def _make_user(username='facts_user', is_staff=False):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password='pw12345!',
        is_staff=is_staff,
    )


def _make_region(name='Anatolia'):
    return Region.objects.create(
        name=name, latitude=39.0, longitude=35.0, is_approved=True,
    )


def _make_group(name='Sarma / Dolma'):
    return HeritageGroup.objects.create(name=name)


class CulturalFactModelTests(APITestCase):
    def test_create_with_no_relations(self):
        fact = CulturalFact.objects.create(text='Stuffing food has Turkic roots.')
        self.assertIsNone(fact.heritage_group)
        self.assertIsNone(fact.region)
        self.assertEqual(fact.source_url, '')

    def test_create_with_heritage_group_only(self):
        group = _make_group()
        fact = CulturalFact.objects.create(
            heritage_group=group,
            text='Dolma comes from Turkish doldurmak, to stuff.',
        )
        self.assertEqual(fact.heritage_group, group)
        self.assertIsNone(fact.region)
        self.assertEqual(group.cultural_facts.count(), 1)

    def test_create_with_region_only(self):
        region = _make_region()
        fact = CulturalFact.objects.create(
            region=region,
            text='Anatolia has been a crossroads of cuisines for millennia.',
        )
        self.assertIsNone(fact.heritage_group)
        self.assertEqual(fact.region, region)
        self.assertEqual(region.cultural_facts.count(), 1)

    def test_create_with_both_relations(self):
        group = _make_group()
        region = _make_region()
        fact = CulturalFact.objects.create(
            heritage_group=group,
            region=region,
            text='Sarma is rolled rather than stuffed in Aegean villages.',
            source_url='https://example.org/sarma',
        )
        self.assertEqual(fact.heritage_group, group)
        self.assertEqual(fact.region, region)
        self.assertEqual(fact.source_url, 'https://example.org/sarma')

    def test_region_set_null_on_region_delete(self):
        region = _make_region()
        fact = CulturalFact.objects.create(region=region, text='X')
        region.delete()
        fact.refresh_from_db()
        self.assertIsNone(fact.region)

    def test_cultural_facts_cascade_on_heritage_group_delete(self):
        group = _make_group()
        CulturalFact.objects.create(heritage_group=group, text='Y')
        self.assertEqual(CulturalFact.objects.count(), 1)
        group.delete()
        self.assertEqual(CulturalFact.objects.count(), 0)


class CulturalFactAPIListTests(APITestCase):
    def setUp(self):
        self.group_a = _make_group('Sarma / Dolma')
        self.group_b = _make_group('Pierogi family')
        self.region_a = _make_region('Anatolia')
        self.region_b = _make_region('Eastern Europe')

        self.fact_general = CulturalFact.objects.create(text='General fact.')
        self.fact_group_a = CulturalFact.objects.create(
            heritage_group=self.group_a, text='Group A fact.',
        )
        self.fact_region_a = CulturalFact.objects.create(
            region=self.region_a, text='Region A fact.',
        )
        self.fact_both_b = CulturalFact.objects.create(
            heritage_group=self.group_b,
            region=self.region_b,
            text='Group B in region B.',
        )

    def _list(self, **params):
        url = reverse('cultural-fact-list')
        return self.client.get(url, params)

    def test_list_returns_all_facts(self):
        response = self._list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 4)

    def test_filter_by_heritage_group(self):
        response = self._list(heritage_group=self.group_a.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = {row['id'] for row in results}
        self.assertEqual(ids, {self.fact_group_a.id})

    def test_filter_by_region(self):
        response = self._list(region=self.region_b.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = {row['id'] for row in results}
        self.assertEqual(ids, {self.fact_both_b.id})

    def test_filter_combined(self):
        response = self._list(heritage_group=self.group_b.id, region=self.region_b.id)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = {row['id'] for row in results}
        self.assertEqual(ids, {self.fact_both_b.id})

    def test_list_serializer_shape(self):
        response = self._list(heritage_group=self.group_a.id)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        row = results[0]
        self.assertEqual(set(row.keys()), {'id', 'heritage_group', 'region', 'text', 'source_url', 'created_at'})
        self.assertEqual(row['heritage_group'], {'id': self.group_a.id, 'name': self.group_a.name})
        self.assertIsNone(row['region'])

    def test_anonymous_read_allowed(self):
        response = self._list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CulturalFactAPICRUDTests(APITestCase):
    def setUp(self):
        self.staff = _make_user('curator', is_staff=True)
        self.regular = _make_user('regular', is_staff=False)
        self.group = _make_group()
        self.region = _make_region()

    def test_anonymous_create_forbidden(self):
        url = reverse('cultural-fact-list')
        response = self.client.post(url, {'text': 'X'}, format='json')
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_non_staff_create_forbidden(self):
        self.client.force_authenticate(user=self.regular)
        url = reverse('cultural-fact-list')
        response = self.client.post(url, {'text': 'X'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_create_with_relations(self):
        self.client.force_authenticate(user=self.staff)
        url = reverse('cultural-fact-list')
        payload = {
            'heritage_group': self.group.id,
            'region': self.region.id,
            'text': 'Dolma comes from doldurmak.',
            'source_url': 'https://example.org/dolma',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['heritage_group'], {'id': self.group.id, 'name': self.group.name})
        self.assertEqual(response.data['region'], {'id': self.region.id, 'name': self.region.name})
        self.assertEqual(CulturalFact.objects.count(), 1)

    def test_staff_create_without_relations(self):
        self.client.force_authenticate(user=self.staff)
        url = reverse('cultural-fact-list')
        response = self.client.post(url, {'text': 'General.'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNone(response.data['heritage_group'])
        self.assertIsNone(response.data['region'])

    def test_staff_update(self):
        fact = CulturalFact.objects.create(text='Old text.')
        self.client.force_authenticate(user=self.staff)
        url = reverse('cultural-fact-detail', args=[fact.id])
        response = self.client.patch(url, {'text': 'New text.'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        fact.refresh_from_db()
        self.assertEqual(fact.text, 'New text.')

    def test_staff_delete(self):
        fact = CulturalFact.objects.create(text='Doomed.')
        self.client.force_authenticate(user=self.staff)
        url = reverse('cultural-fact-detail', args=[fact.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(CulturalFact.objects.count(), 0)

    def test_anonymous_retrieve_allowed(self):
        fact = CulturalFact.objects.create(text='Public fact.')
        url = reverse('cultural-fact-detail', args=[fact.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], fact.id)


class CulturalFactRandomEndpointTests(APITestCase):
    def test_random_returns_404_when_empty(self):
        url = reverse('cultural-fact-random')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_random_returns_a_fact_when_rows_exist(self):
        group = _make_group()
        for i in range(5):
            CulturalFact.objects.create(heritage_group=group, text=f'Fact {i}.')
        url = reverse('cultural-fact-random')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(response.data['text'], {f'Fact {i}.' for i in range(5)})
        self.assertEqual(response.data['heritage_group'], {'id': group.id, 'name': group.name})

    def test_random_respects_filters(self):
        group_a = _make_group('A')
        group_b = _make_group('B')
        CulturalFact.objects.create(heritage_group=group_a, text='A1')
        CulturalFact.objects.create(heritage_group=group_a, text='A2')
        CulturalFact.objects.create(heritage_group=group_b, text='B1')

        url = reverse('cultural-fact-random')
        response = self.client.get(url, {'heritage_group': group_b.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['text'], 'B1')

    def test_random_anonymous_allowed(self):
        CulturalFact.objects.create(text='Anyone.')
        url = reverse('cultural-fact-random')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
