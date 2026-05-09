"""Tests for the map_discovery app (#381 — M5-15).

Coverage:
  - RegionIndexView         GET /api/map/regions/
  - RegionDetailView        GET /api/map/regions/<id>/
  - RegionContentView       GET /api/map/regions/<id>/content/
  - BoundingBoxDiscoverView GET /api/map/discover/
  - Region model geo fields
  - Story.region FK + fallback behaviour
  - CulturalContent.region FK migration
  - seed_region_geodata management command
"""

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from io import StringIO
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cultural_content.models import CulturalContent
from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures helpers
# ---------------------------------------------------------------------------

def make_user(username='testuser', email=None):
    email = email or f'{username}@example.com'
    user, _ = User.objects.get_or_create(
        email=email,
        defaults={'username': username},
    )
    user.set_password('pass1234')
    user.save()
    return user


def make_region(name, lat=None, lon=None, parent=None):
    """Get or create a Region, updating geo fields if provided."""
    region, _ = Region.objects.get_or_create(name=name)
    update_fields = []
    if lat is not None and region.latitude != lat:
        region.latitude = lat
        update_fields.append('latitude')
    if lon is not None and region.longitude != lon:
        region.longitude = lon
        update_fields.append('longitude')
    if parent is not None and region.parent != parent:
        region.parent = parent
        update_fields.append('parent')
    if update_fields:
        region.save(update_fields=update_fields)
    return region


def make_recipe(author, region, title='Test Recipe', published=True):
    r = Recipe.objects.create(
        title=title, description='desc', author=author, region=region,
        is_published=published,
    )
    return r


def make_story(author, region=None, linked_recipe=None, published=True):
    return Story.objects.create(
        title='Test Story', body='body', author=author,
        region=region, linked_recipe=linked_recipe,
        is_published=published,
    )


def make_cultural(region=None, slug='test-slug', is_active=True):
    cc, _ = CulturalContent.objects.get_or_create(
        slug=slug,
        defaults={
            'kind': 'fact', 'title': 'Test Cultural',
            'body': 'body', 'region': region, 'is_active': is_active,
        },
    )
    return cc


# ===========================================================================
# Region Model Tests
# ===========================================================================

class RegionModelTests(TestCase):

    def test_region_geo_fields_optional(self):
        r = Region.objects.create(name='NoGeo')
        self.assertIsNone(r.latitude)
        self.assertIsNone(r.longitude)
        self.assertIsNone(r.bbox_north)

    def test_region_parent_self_fk(self):
        parent = make_region('Turkey', lat=39.0, lon=35.0)
        child  = make_region('Aegean', lat=38.2, lon=27.5, parent=parent)
        self.assertEqual(child.parent, parent)
        self.assertIn(child, parent.children.all())

    def test_region_str(self):
        r = make_region('Anatolia')
        self.assertEqual(str(r), 'Anatolia')


# ===========================================================================
# Story Region FK Tests
# ===========================================================================

class StoryRegionTests(TestCase):

    def setUp(self):
        self.user   = make_user()
        self.region = make_region('Aegean', lat=38.2, lon=27.5)

    def test_story_direct_region(self):
        story = make_story(self.user, region=self.region)
        self.assertEqual(story.region, self.region)

    def test_story_region_nullable(self):
        story = make_story(self.user, region=None)
        self.assertIsNone(story.region)

    def test_story_region_delete_sets_null(self):
        region = make_region('Temp', lat=1.0, lon=1.0)
        story  = make_story(self.user, region=region)
        region.delete()
        story.refresh_from_db()
        self.assertIsNone(story.region)


# ===========================================================================
# CulturalContent Region FK Tests
# ===========================================================================

class CulturalContentRegionTests(TestCase):

    def test_cultural_region_fk(self):
        region   = make_region('Turkey', lat=39.0, lon=35.0)
        cultural = make_cultural(region=region, slug='turkey-fact')
        self.assertEqual(cultural.region, region)

    def test_cultural_region_nullable(self):
        cultural = make_cultural(slug='no-region')
        self.assertIsNone(cultural.region)

    def test_cultural_region_text_fallback(self):
        cc = CulturalContent.objects.create(
            slug='legacy', kind='fact', title='Legacy',
            body='body', region=None, region_text='Old Region',
        )
        self.assertEqual(cc.region_text, 'Old Region')
        self.assertIsNone(cc.region)


# ===========================================================================
# RegionIndexView Tests  — GET /api/map/regions/
# ===========================================================================

class RegionIndexViewTests(APITestCase):

    def setUp(self):
        self.user    = make_user()
        self.region1 = make_region('Turkey',   lat=39.0, lon=35.0)
        self.region2 = make_region('Aegean',   lat=38.2, lon=27.5)
        # Use a unique name that won't conflict with seed data
        self.no_geo, _ = Region.objects.get_or_create(name='__test_no_geo__')

    def test_returns_only_geo_regions_by_default(self):
        url = '/api/map/regions/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [r['name'] for r in resp.data]
        self.assertIn('Turkey', names)
        self.assertIn('Aegean', names)
        self.assertNotIn('Unknown', names)

    def test_geo_only_false_returns_all(self):
        url = '/api/map/regions/?geo_only=false'
        resp = self.client.get(url)
        names = [r['name'] for r in resp.data]
        self.assertIn('__test_no_geo__', names)

    def test_content_counts_present(self):
        recipe = make_recipe(self.user, self.region1)
        url = '/api/map/regions/'
        resp = self.client.get(url)
        turkey = next(r for r in resp.data if r['name'] == 'Turkey')
        self.assertEqual(turkey['content_count']['recipes'], 1)

    def test_has_geo_field(self):
        url = '/api/map/regions/'
        resp = self.client.get(url)
        turkey = next(r for r in resp.data if r['name'] == 'Turkey')
        self.assertTrue(turkey['has_geo'])

    def test_no_auth_required(self):
        resp = self.client.get('/api/map/regions/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ===========================================================================
# RegionDetailView Tests  — GET /api/map/regions/<id>/
# ===========================================================================

class RegionDetailViewTests(APITestCase):

    def setUp(self):
        self.user   = make_user()
        self.region = make_region('Anatolia', lat=39.2, lon=35.5)

    def test_returns_region(self):
        resp = self.client.get(f'/api/map/regions/{self.region.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['name'], 'Anatolia')

    def test_includes_content_count(self):
        make_recipe(self.user, self.region)
        resp = self.client.get(f'/api/map/regions/{self.region.id}/')
        self.assertIn('content_count', resp.data)
        self.assertEqual(resp.data['content_count']['recipes'], 1)

    def test_404_on_missing(self):
        resp = self.client.get('/api/map/regions/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# RegionContentView Tests  — GET /api/map/regions/<id>/content/
# ===========================================================================

class RegionContentViewTests(APITestCase):

    def setUp(self):
        self.user   = make_user()
        self.region = make_region('Aegean', lat=38.2, lon=27.5)
        self.recipe  = make_recipe(self.user, self.region, title='Aegean Salad')
        # Story tagged directly
        self.story_direct = make_story(self.user, region=self.region)
        # Story via linked recipe
        self.story_linked = make_story(self.user, region=None, linked_recipe=self.recipe)
        # Cultural content
        self.cultural = make_cultural(region=self.region, slug='aegean-fact')

    def test_returns_all_content_types(self):
        resp = self.client.get(f'/api/map/regions/{self.region.id}/content/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        types = {item['content_type'] for item in resp.data['results']}
        self.assertIn('recipe', types)
        self.assertIn('story', types)
        self.assertIn('cultural', types)

    def test_filter_by_type_recipe(self):
        resp = self.client.get(f'/api/map/regions/{self.region.id}/content/?type=recipe')
        for item in resp.data['results']:
            self.assertEqual(item['content_type'], 'recipe')

    def test_filter_by_type_story(self):
        resp = self.client.get(f'/api/map/regions/{self.region.id}/content/?type=story')
        for item in resp.data['results']:
            self.assertEqual(item['content_type'], 'story')

    def test_filter_by_type_cultural(self):
        resp = self.client.get(f'/api/map/regions/{self.region.id}/content/?type=cultural')
        for item in resp.data['results']:
            self.assertEqual(item['content_type'], 'cultural')

    def test_stories_via_linked_recipe_included(self):
        """Story with no direct region but a linked recipe in the region appears."""
        resp = self.client.get(f'/api/map/regions/{self.region.id}/content/?type=story')
        ids = [item['id'] for item in resp.data['results']]
        self.assertIn(self.story_linked.id, ids)

    def test_unpublished_excluded(self):
        make_recipe(self.user, self.region, title='Draft', published=False)
        resp = self.client.get(f'/api/map/regions/{self.region.id}/content/?type=recipe')
        titles = [item['title'] for item in resp.data['results']]
        self.assertNotIn('Draft', titles)

    def test_404_on_missing_region(self):
        resp = self.client.get('/api/map/regions/99999/content/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# BoundingBoxDiscoverView Tests  — GET /api/map/discover/
# ===========================================================================

class BoundingBoxDiscoverViewTests(APITestCase):

    def setUp(self):
        self.user    = make_user()
        self.turkey  = make_region('Turkey',   lat=39.0, lon=35.0)
        self.japan   = make_region('Japan',    lat=36.0, lon=138.0)
        self.no_geo, _ = Region.objects.get_or_create(name='__test_no_geo_2__')
        make_recipe(self.user, self.turkey)

    def _discover(self, north, south, east, west, **extra):
        return self.client.get(
            f'/api/map/discover/',
            {'north': north, 'south': south, 'east': east, 'west': west, **extra},
        )

    def test_includes_region_in_viewport(self):
        resp = self._discover(north=42, south=36, east=45, west=25)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [r['name'] for r in resp.data['regions']]
        self.assertIn('Turkey', names)

    def test_excludes_region_outside_viewport(self):
        resp = self._discover(north=42, south=36, east=45, west=25)
        names = [r['name'] for r in resp.data['regions']]
        self.assertNotIn('Japan', names)

    def test_excludes_region_without_geo(self):
        resp = self._discover(north=90, south=-90, east=180, west=-180)
        names = [r['name'] for r in resp.data['regions']]
        self.assertNotIn('__test_no_geo_2__', names)

    def test_total_content_count(self):
        resp = self._discover(north=42, south=36, east=45, west=25)
        self.assertGreaterEqual(resp.data['total_content'], 1)

    def test_viewport_echoed_in_response(self):
        resp = self._discover(north=42, south=36, east=45, west=25)
        vp = resp.data['viewport']
        self.assertEqual(vp['north'], 42.0)
        self.assertEqual(vp['south'], 36.0)

    def test_missing_params_returns_400(self):
        resp = self.client.get('/api/map/discover/', {'north': 42})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_param_type_returns_400(self):
        resp = self._discover(north='abc', south=36, east=45, west=25)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_south_greater_than_north_returns_400(self):
        resp = self._discover(north=30, south=42, east=45, west=25)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_keyword_filter_includes_matching_region(self):
        make_recipe(self.user, self.turkey, title='Turkish Baklava')
        resp = self._discover(north=42, south=36, east=45, west=25, q='Baklava')
        names = [r['name'] for r in resp.data['regions']]
        self.assertIn('Turkey', names)

    def test_keyword_filter_excludes_non_matching_region(self):
        # japan has no matching content
        resp = self._discover(north=90, south=-90, east=180, west=-180, q='XYZ_NO_MATCH')
        names = [r['name'] for r in resp.data['regions']]
        self.assertEqual(len(names), 0)

    def test_no_auth_required(self):
        resp = self._discover(north=42, south=36, east=45, west=25)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_crosses_antimeridian(self):
        """Viewport crossing the Pacific antimeridian (east < west) should work."""
        # Create a region in the Far East (e.g., Japan, lon=138)
        # Create a region in the Far West (e.g., Hawaii, lon=-155)
        make_region('Japan', lat=36.0, lon=138.0)
        make_region('Hawaii', lat=20.0, lon=-155.0)

        # Viewport: North=40, South=10, East=-150, West=130
        # This box includes both Japan and Hawaii if it wraps around
        resp = self._discover(north=40, south=10, east=-150, west=130)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        names = [r['name'] for r in resp.data['regions']]
        self.assertIn('Japan', names)
        self.assertIn('Hawaii', names)


# ===========================================================================
# Seed Command Tests
# ===========================================================================

class SeedRegionGeodataCommandTests(TestCase):

    def _call(self, *args, **kwargs):
        out = StringIO()
        call_command('seed_region_geodata', *args, stdout=out, **kwargs)
        return out.getvalue()

    def test_updates_matching_region(self):
        # Turkey already exists from seed migration; ensure coords are cleared first
        turkey, _ = Region.objects.get_or_create(name='Turkey')
        turkey.latitude = None
        turkey.longitude = None
        turkey.save(update_fields=['latitude', 'longitude'])
        self._call('--overwrite')
        turkey.refresh_from_db()
        self.assertIsNotNone(turkey.latitude)
        self.assertIsNotNone(turkey.longitude)

    def test_dry_run_does_not_persist(self):
        turkey, _ = Region.objects.get_or_create(name='Turkey')
        turkey.latitude = None
        turkey.longitude = None
        turkey.save(update_fields=['latitude', 'longitude'])
        self._call('--dry-run')
        turkey.refresh_from_db()
        self.assertIsNone(turkey.latitude)

    def test_skips_region_already_with_coords_by_default(self):
        turkey, _ = Region.objects.get_or_create(name='Turkey')
        turkey.latitude = 1.0
        turkey.longitude = 1.0
        turkey.save(update_fields=['latitude', 'longitude'])
        self._call()
        turkey.refresh_from_db()
        # Should NOT have been overwritten
        self.assertEqual(turkey.latitude, 1.0)

    def test_overwrite_flag_replaces_coords(self):
        turkey, _ = Region.objects.get_or_create(name='Turkey')
        turkey.latitude = 1.0
        turkey.longitude = 1.0
        turkey.save(update_fields=['latitude', 'longitude'])
        self._call('--overwrite')
        turkey.refresh_from_db()
        self.assertNotEqual(turkey.latitude, 1.0)

    def test_not_found_regions_reported_not_errored(self):
        out = self._call()
        # Command should complete without exception even when many seed names
        # are not in the DB; missing names listed in warning block.
        self.assertIn('Done.', out)

    def test_sets_parent_fk(self):
        turkey, _ = Region.objects.get_or_create(name='Turkey')
        aegean, _ = Region.objects.get_or_create(name='Aegean')
        # Clear coords so the command will update them
        for r in [turkey, aegean]:
            r.latitude = None
            r.longitude = None
            r.parent = None
            r.save(update_fields=['latitude', 'longitude', 'parent'])
        self._call('--overwrite')
        aegean.refresh_from_db()
        self.assertIsNotNone(aegean.parent)
        self.assertEqual(aegean.parent.name, 'Turkey')
