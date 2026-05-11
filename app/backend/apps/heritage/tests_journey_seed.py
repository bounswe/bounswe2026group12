"""Regression: seed_canonical must populate HeritageJourneyStep rows.

Issue #681 asks for 3 to 5 ordered, narrated journey steps per heritage
group so the mobile "Journey through time" timeline (#504) has data to
render. These tests pin the contract: after seed_canonical every group
has between 3 and 5 steps, the orders are contiguous from 1, and the
list endpoint returns them in order.
"""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.heritage.models import HeritageGroup, HeritageJourneyStep


class HeritageJourneyStepSeedTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_canonical', stdout=StringIO())

    def setUp(self):
        self.client = APIClient()

    def test_groups_were_seeded(self):
        self.assertGreater(HeritageGroup.objects.count(), 0)

    def test_each_group_has_three_to_five_steps(self):
        for group in HeritageGroup.objects.all():
            count = group.journey_steps.count()
            self.assertGreaterEqual(
                count, 3, f"{group.name} has only {count} journey steps",
            )
            self.assertLessEqual(
                count, 5, f"{group.name} has {count} journey steps (max 5)",
            )

    def test_step_orders_are_contiguous_from_one(self):
        for group in HeritageGroup.objects.all():
            orders = list(
                group.journey_steps.order_by('order').values_list('order', flat=True)
            )
            self.assertEqual(
                orders, list(range(1, len(orders) + 1)),
                f"{group.name} has non-contiguous step orders: {orders}",
            )

    def test_step_story_and_location_are_non_empty(self):
        for step in HeritageJourneyStep.objects.all():
            self.assertTrue(step.location.strip(), f"empty location on step {step.id}")
            self.assertTrue(step.story.strip(), f"empty story on step {step.id}")

    def test_list_endpoint_returns_group_steps_in_order(self):
        group = HeritageGroup.objects.first()
        url = reverse('heritage-journey-step-list')
        response = self.client.get(url, {'heritage_group': group.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = (
            response.data['results']
            if isinstance(response.data, dict) and 'results' in response.data
            else response.data
        )
        self.assertEqual(
            [r['heritage_group'] for r in results],
            [group.id] * len(results),
        )
        orders = [r['order'] for r in results]
        self.assertEqual(orders, sorted(orders))
        self.assertEqual(orders, list(range(1, len(orders) + 1)))

    def test_reseeding_is_idempotent_on_step_count(self):
        before = HeritageJourneyStep.objects.count()
        call_command('seed_canonical', stdout=StringIO())
        self.assertEqual(HeritageJourneyStep.objects.count(), before)
