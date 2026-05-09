"""Dropdown latency budget guard (M6-05, #356).

Lab 9 / requirement 4.2.x commits to a 1-second dropdown fill budget. The
recipe-create form and search filter chips fan out into the lookup endpoints
seeded under `apps.recipes`, so this module asserts that each one stays under
the budget after the realistic mock-data growth shipped in #475 and the
audit-field expansion from #467.

The budget is intentionally enforced without caching: any caching layer would
mask a regression in the underlying queryset shape.
"""

from __future__ import annotations

import statistics
import time
from typing import Iterable

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import (
    DietaryTag,
    EventTag,
    Ingredient,
    Region,
    Religion,
    Unit,
)


DROPDOWN_BUDGET_SECONDS = 1.0
RUN_COUNT = 5


class DropdownLatencyBudgetTests(APITestCase):
    """Hit each lookup endpoint anonymously, time it, assert under budget."""

    @classmethod
    def setUpTestData(cls):
        # Push volume on top of the seed migrations (0004 regions, 0005
        # ingredients/units, 0013 taxonomy) so the timing reflects a realistic
        # dataset rather than the handful of curated rows.
        cls._bulk_seed(Ingredient, prefix='perf-ingredient', count=500)
        cls._bulk_seed(Unit, prefix='perf-unit', count=200)
        cls._bulk_seed(DietaryTag, prefix='perf-diet', count=200)
        cls._bulk_seed(EventTag, prefix='perf-event', count=200)
        cls._bulk_seed(Religion, prefix='perf-religion', count=200)
        cls._bulk_seed(Region, prefix='perf-region', count=200)

    @staticmethod
    def _bulk_seed(model, *, prefix: str, count: int) -> None:
        """Insert `count` approved rows whose names are guaranteed unique."""
        existing = set(model.objects.filter(name__startswith=prefix).values_list('name', flat=True))
        rows = [
            model(name=f'{prefix}-{i:04d}', is_approved=True)
            for i in range(count)
            if f'{prefix}-{i:04d}' not in existing
        ]
        if rows:
            model.objects.bulk_create(rows)

    def _measure_median(self, url: str) -> float:
        """Hit the endpoint RUN_COUNT times anonymously and return the median wall-clock seconds."""
        timings: list[float] = []
        for _ in range(RUN_COUNT):
            start = time.perf_counter()
            response = self.client.get(url)
            elapsed = time.perf_counter() - start
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                msg=f'{url} returned {response.status_code}',
            )
            timings.append(elapsed)
        return statistics.median(timings)

    def _assert_under_budget(self, label: str, url: str) -> None:
        median = self._measure_median(url)
        # Visible in `manage.py test -v 2` output and CI logs for inspection.
        print(f'[dropdown-perf] {label}: median={median:.4f}s budget={DROPDOWN_BUDGET_SECONDS:.2f}s')
        self.assertLess(
            median,
            DROPDOWN_BUDGET_SECONDS,
            msg=f'{label} median {median:.4f}s exceeds budget {DROPDOWN_BUDGET_SECONDS:.2f}s',
        )

    def test_ingredients_lookup_under_budget(self):
        self._assert_under_budget('ingredients', reverse('ingredient-list'))

    def test_units_lookup_under_budget(self):
        self._assert_under_budget('units', reverse('unit-list'))

    def test_regions_lookup_under_budget(self):
        self._assert_under_budget('regions', reverse('region-list'))

    def test_dietary_tags_lookup_under_budget(self):
        self._assert_under_budget('dietary-tags', reverse('dietary-tag-list'))

    def test_event_tags_lookup_under_budget(self):
        self._assert_under_budget('event-tags', reverse('event-tag-list'))

    def test_religions_lookup_under_budget(self):
        self._assert_under_budget('religions', reverse('religion-list'))
