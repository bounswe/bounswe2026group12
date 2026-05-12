"""Tests for the seed_story_coordinates management command (#757).

Run order: seed_canonical → seed_region_geo → seed_story_coordinates.
seed_region_geo must run first because it populates Region.bbox_* fields.
"""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.stories.models import Story


class SeedStoryCoordinatesCommandTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_canonical', stdout=StringIO())
        call_command('seed_region_geo', stdout=StringIO())
        call_command('seed_story_coordinates', stdout=StringIO())

    def test_stories_with_bbox_region_have_coordinates(self):
        """Every published story whose region has a bbox should have coords."""
        for story in Story.objects.filter(is_published=True).select_related('region'):
            if story.region is None:
                continue
            r = story.region
            if None in (r.bbox_north, r.bbox_south, r.bbox_east, r.bbox_west):
                continue
            self.assertIsNotNone(story.latitude,
                f'story {story.id!r} ({story.title!r}) latitude is null')
            self.assertIsNotNone(story.longitude,
                f'story {story.id!r} ({story.title!r}) longitude is null')

    def test_stories_without_region_remain_null(self):
        for story in Story.objects.filter(region__isnull=True):
            self.assertIsNone(story.latitude,
                f'story {story.id} has no region but got latitude')
            self.assertIsNone(story.longitude,
                f'story {story.id} has no region but got longitude')

    def test_coordinates_lie_inside_region_bbox(self):
        for story in Story.objects.exclude(latitude__isnull=True).select_related('region'):
            region = story.region
            self.assertIsNotNone(region, f'story {story.id} has coords but no region')
            self.assertGreaterEqual(float(story.latitude), region.bbox_south,
                f'story {story.id} latitude below region bbox_south')
            self.assertLessEqual(float(story.latitude), region.bbox_north,
                f'story {story.id} latitude above region bbox_north')
            self.assertGreaterEqual(float(story.longitude), region.bbox_west,
                f'story {story.id} longitude left of region bbox_west')
            self.assertLessEqual(float(story.longitude), region.bbox_east,
                f'story {story.id} longitude right of region bbox_east')

    def test_rerun_is_idempotent(self):
        first = {(s.id, s.latitude, s.longitude) for s in Story.objects.all()}
        call_command('seed_story_coordinates', stdout=StringIO())
        second = {(s.id, s.latitude, s.longitude) for s in Story.objects.all()}
        self.assertEqual(first, second, 'second run changed story coordinates')

    def test_already_set_rows_are_not_overwritten(self):
        """A story with existing coords must keep them after a rerun."""
        story = Story.objects.exclude(latitude__isnull=True).first()
        self.assertIsNotNone(story, 'need at least one story with coords')
        original_lat = story.latitude
        original_lng = story.longitude
        call_command('seed_story_coordinates', stdout=StringIO())
        story.refresh_from_db()
        self.assertEqual(story.latitude, original_lat)
        self.assertEqual(story.longitude, original_lng)

    def test_api_returns_non_null_coordinates_for_stories_with_region(self):
        """GET /api/stories/ must include at least one story with non-null lat/lng."""
        client = APIClient()
        response = client.get('/api/stories/')
        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        stories_with_coords = [s for s in results if s.get('latitude') is not None]
        self.assertGreater(len(stories_with_coords), 0,
            'expected at least one story with coordinates in API response')
