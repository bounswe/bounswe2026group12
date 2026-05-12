"""Tests for the region cultural facts seeder and the facts endpoint (#664).

Covers that `seed_cultural_facts` populates a healthy number of
region-tied CulturalFact rows, that coverage spreads across regions, that
it is idempotent and skips unknown regions, and that the public
/api/cultural-facts/ endpoint serves them (filtering by ?region= and the
/random/ action).
"""
from io import StringIO

from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Region

from .models import CulturalFact


# Bounds chosen well under what the fixture currently ships (~93 facts
# across 31 regions) so these tests do not have to move every time a fact
# is added or removed.
MIN_REGION_FACTS = 60
MIN_REGIONS_COVERED = 25


def _seed():
    """Seed regions and group facts (seed_canonical) then the region facts."""
    call_command('seed_canonical', stdout=StringIO(), stderr=StringIO())
    out = StringIO()
    call_command('seed_cultural_facts', stdout=out, stderr=StringIO())
    return out.getvalue()


class RegionCulturalFactsSeededTests(APITestCase):
    """Behaviour once the full seed has run."""

    @classmethod
    def setUpTestData(cls):
        _seed()

    def test_seeds_a_healthy_number_of_region_facts(self):
        count = CulturalFact.objects.filter(region__isnull=False).count()
        self.assertGreaterEqual(count, MIN_REGION_FACTS)

    def test_region_facts_have_no_heritage_group(self):
        # The seeder creates region-tied facts with heritage_group left null.
        region_only = CulturalFact.objects.filter(
            region__isnull=False, heritage_group__isnull=True,
        )
        self.assertGreaterEqual(region_only.count(), MIN_REGION_FACTS)

    def test_coverage_spreads_across_regions(self):
        covered = set(
            CulturalFact.objects.filter(region__isnull=False)
            .values_list('region_id', flat=True)
        )
        self.assertGreaterEqual(len(covered), MIN_REGIONS_COVERED)
        # Every region that got a fact has at least one.
        for region in Region.objects.filter(cultural_facts__isnull=False).distinct():
            self.assertGreaterEqual(region.cultural_facts.count(), 1)

    def test_endpoint_filters_by_region(self):
        region = Region.objects.filter(cultural_facts__isnull=False).first()
        expected_ids = set(
            CulturalFact.objects.filter(region=region).values_list('id', flat=True)
        )
        resp = self.client.get(reverse('cultural-fact-list'), {'region': region.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        returned_ids = {item['id'] for item in resp.data}
        self.assertEqual(returned_ids, expected_ids)
        self.assertGreaterEqual(len(returned_ids), 1)
        for item in resp.data:
            # The serializer nests region as {'id': ..., 'name': ...}.
            self.assertEqual(item['region']['id'], region.id)

    def test_random_endpoint_returns_a_fact(self):
        resp = self.client.get(reverse('cultural-fact-random'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('text', resp.data)
        self.assertTrue(resp.data['text'])


class RegionCulturalFactsSeederBehaviorTests(APITestCase):
    """Idempotency, graceful skipping, and the empty-database case."""

    def test_seeder_is_idempotent(self):
        _seed()
        before = CulturalFact.objects.count()
        out = StringIO()
        call_command('seed_cultural_facts', stdout=out, stderr=StringIO())
        self.assertEqual(CulturalFact.objects.count(), before)
        self.assertIn('Seeded 0 region cultural facts', out.getvalue())

    def test_seeder_skips_unknown_regions_without_crashing(self):
        # Remove a region that the fixture has facts for, then seed: the
        # command must warn and move on instead of raising.
        call_command('seed_canonical', stdout=StringIO(), stderr=StringIO())
        Region.objects.filter(name='Aegean').delete()
        out = StringIO()
        call_command('seed_cultural_facts', stdout=out, stderr=StringIO())
        self.assertIn('Region not found, skipped its facts: Aegean', out.getvalue())
        self.assertFalse(CulturalFact.objects.filter(region__name='Aegean').exists())
        # Other regions are still seeded normally.
        self.assertGreaterEqual(
            CulturalFact.objects.filter(region__isnull=False).count(), MIN_REGION_FACTS,
        )

    def test_random_endpoint_404_when_empty(self):
        # A fresh test database has regions (migration-seeded) but no facts.
        self.assertEqual(CulturalFact.objects.count(), 0)
        resp = self.client.get(reverse('cultural-fact-random'))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
