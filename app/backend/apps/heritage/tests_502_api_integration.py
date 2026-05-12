"""API integration coverage for the Heritage feature (issue #502, backend slice).

This is the backend / API portion of #502's cross-platform integration plan.
The web and mobile UI checklist items in #502 are exercised separately by the
frontend and mobile teams. These tests build their own ORM fixtures in setUp
(not seed_canonical) so they are deterministic and insulated from the parallel
seed-data work.

It deliberately lives in its own module so it does not collide with the older
apps/heritage/tests_integration.py; the two overlap on a few scenarios but this
file additionally covers the journey-steps filter endpoint, cultural-facts/random,
single-member and coordinate-less edge cases, and asserts member-count drop on
recipe deletion.

Test method -> #502 API scenario map:
  test_group_built_with_recipes_and_stories_across_regions
      -> HeritageGroup with 3+ recipe members and 2+ story members from
         different regions
  test_groups_list_returns_member_count
      -> GET /api/heritage-groups/ returns the group with correct member count
  test_group_detail_returns_members_with_full_shape
      -> GET /api/heritage-groups/<id>/ returns members with content_type,
         title, author, region, latitude, longitude
  test_recipe_detail_exposes_heritage_group_for_member
      -> GET /api/recipes/<id>/ for a member recipe returns heritage_group {id, name}
  test_recipe_detail_heritage_group_null_for_non_member
      -> GET /api/recipes/<id>/ for a non-member recipe returns heritage_group null
  test_story_detail_exposes_heritage_group_for_member
      -> GET /api/stories/<id>/ for a member story returns heritage_group {id, name}
  test_deleting_recipe_drops_membership_and_member_count
      -> Deleting a recipe removes its HeritageGroupMembership; group stays
         resolvable and the member count drops
  test_group_with_zero_members_is_valid
      -> A heritage group with 0 members still returns 200 with an empty members list
  test_group_with_single_member
      -> Edge: a heritage group with exactly 1 member works
  test_member_without_coordinates_still_listed
      -> Edge: members whose region has no lat/lng still appear in the members list
  test_journey_steps_filtered_by_group_in_order
      -> GET /api/heritage-journey-steps/?heritage_group=<id> returns steps in order
  test_cultural_facts_random_returns_fact_when_present
      -> GET /api/cultural-facts/random/ returns 200 with a fact when facts exist
  test_cultural_facts_random_404_when_empty
      -> GET /api/cultural-facts/random/ returns 404 when no facts exist
"""
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

from .models import (
    CulturalFact,
    HeritageGroup,
    HeritageGroupMembership,
    HeritageJourneyStep,
)


User = get_user_model()


def _user(username):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password='pw12345!',
    )


def _region(name, lat=None, lng=None):
    return Region.objects.create(
        name=name, latitude=lat, longitude=lng, is_approved=True,
    )


def _recipe(author, region, title):
    return Recipe.objects.create(
        title=title,
        description=f'Description for {title}.',
        author=author,
        region=region,
        is_published=True,
    )


def _story(author, region, title):
    return Story.objects.create(
        title=title,
        body=f'Body text for {title}.',
        author=author,
        region=region,
        is_published=True,
    )


def _add_to_group(group, obj):
    return HeritageGroupMembership.objects.create(
        heritage_group=group,
        content_type=ContentType.objects.get_for_model(type(obj)),
        object_id=obj.id,
    )


def _as_list(data):
    """Return the row list whether or not the endpoint is paginated."""
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


class HeritageApiIntegration502Tests(APITestCase):
    """End-to-end API checks for the Heritage feature, backend slice of #502."""

    @classmethod
    def setUpTestData(cls):
        cls.curator = _user('heritage_curator_502')
        cls.author_anatolia = _user('author_anatolia_502')
        cls.author_aegean = _user('author_aegean_502')
        cls.author_balkan = _user('author_balkan_502')
        cls.author_nordic = _user('author_nordic_502')
        cls.author_lone = _user('author_lone_502')

        cls.region_anatolia = _region('Anatolia 502', 39.0, 35.0)
        cls.region_aegean = _region('Aegean 502', 38.4, 27.1)
        cls.region_balkan = _region('Balkan 502', 42.7, 25.5)
        cls.region_nordic = _region('Nordic 502', 60.1, 18.6)
        cls.region_no_coords = _region('Coordless Region 502')

        # Main group: 3 recipe members + 2 story members across 4 regions
        # (plus a coordinate-less recipe member, see edge-case test).
        cls.group = HeritageGroup.objects.create(
            name='Sarma and Dolma Lineage 502',
            description='Stuffed and rolled dishes from Anatolia to Scandinavia.',
        )
        cls.recipe_anatolia = _recipe(
            cls.author_anatolia, cls.region_anatolia, 'Anatolian Yaprak Sarma 502',
        )
        cls.recipe_aegean = _recipe(
            cls.author_aegean, cls.region_aegean, 'Aegean Dolma 502',
        )
        cls.recipe_balkan = _recipe(
            cls.author_balkan, cls.region_balkan, 'Balkan Sarma 502',
        )
        cls.story_anatolia = _story(
            cls.author_anatolia, cls.region_anatolia, 'Rolling Sarma in the Village 502',
        )
        cls.story_nordic = _story(
            cls.author_nordic, cls.region_nordic, 'Kaldolmar from the Empire 502',
        )
        cls.recipe_no_coords = _recipe(
            cls.author_anatolia, cls.region_no_coords, 'Sarma With No Map Pin 502',
        )
        for obj in (
            cls.recipe_anatolia, cls.recipe_aegean, cls.recipe_balkan,
            cls.story_anatolia, cls.story_nordic, cls.recipe_no_coords,
        ):
            _add_to_group(cls.group, obj)

        # Journey steps, inserted out of order on purpose to prove ordering.
        HeritageJourneyStep.objects.create(
            heritage_group=cls.group, order=3,
            location='Balkans', story='Cabbage rolls take root.', era='Ottoman',
        )
        HeritageJourneyStep.objects.create(
            heritage_group=cls.group, order=1,
            location='Central Asia', story='Origin on the steppe.', era='Pre-Islamic',
        )
        HeritageJourneyStep.objects.create(
            heritage_group=cls.group, order=2,
            location='Anatolia', story='Grape leaves and rice.', era='Seljuk',
        )

        # A recipe and a story that belong to no heritage group.
        cls.lone_recipe = _recipe(
            cls.author_lone, cls.region_anatolia, 'Standalone Pilaf 502',
        )

        # An empty group (zero members, zero steps).
        cls.empty_group = HeritageGroup.objects.create(
            name='Empty Heritage Group 502', description='Nothing wired up yet.',
        )

        # A group with exactly one member.
        cls.single_group = HeritageGroup.objects.create(
            name='Single Member Group 502', description='Just one dish.',
        )
        cls.single_recipe = _recipe(
            cls.author_aegean, cls.region_aegean, 'Lonely Dolma 502',
        )
        _add_to_group(cls.single_group, cls.single_recipe)

        # Cultural facts for the random endpoint.
        cls.fact_a = CulturalFact.objects.create(
            heritage_group=cls.group, region=cls.region_anatolia,
            text='Sarma means "wrapped" in Turkish.',
        )
        cls.fact_b = CulturalFact.objects.create(
            text='Stuffed-leaf dishes appear across the former Ottoman world.',
        )

    # --- HeritageGroup fixture / membership wiring ---

    def test_group_built_with_recipes_and_stories_across_regions(self):
        memberships = self.group.memberships.all()
        recipe_ct = ContentType.objects.get_for_model(Recipe)
        story_ct = ContentType.objects.get_for_model(Story)
        recipe_members = [m for m in memberships if m.content_type_id == recipe_ct.id]
        story_members = [m for m in memberships if m.content_type_id == story_ct.id]
        self.assertGreaterEqual(len(recipe_members), 3)
        self.assertGreaterEqual(len(story_members), 2)

        regions = set()
        for m in memberships:
            obj = m.content_object
            if obj is not None and obj.region_id is not None:
                regions.add(obj.region.name)
        self.assertGreaterEqual(
            len(regions), 3, f'expected members from 3+ regions, got {regions}',
        )

    # --- GET /api/heritage-groups/ ---

    def test_groups_list_returns_member_count(self):
        response = self.client.get(reverse('heritage-group-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = _as_list(response.data)
        by_id = {row['id']: row for row in rows}

        self.assertIn(self.group.id, by_id)
        self.assertEqual(by_id[self.group.id]['name'], 'Sarma and Dolma Lineage 502')
        self.assertEqual(by_id[self.group.id]['member_count'], 6)
        self.assertEqual(by_id[self.empty_group.id]['member_count'], 0)
        self.assertEqual(by_id[self.single_group.id]['member_count'], 1)

    # --- GET /api/heritage-groups/<id>/ ---

    def test_group_detail_returns_members_with_full_shape(self):
        response = self.client.get(
            reverse('heritage-group-detail', args=[self.group.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.group.id)
        self.assertEqual(response.data['name'], 'Sarma and Dolma Lineage 502')

        members = response.data['members']
        self.assertEqual(len(members), 6)
        self.assertEqual(
            {m['content_type'] for m in members}, {'recipe', 'story'},
        )

        by_title = {m['title']: m for m in members}

        recipe_member = by_title['Anatolian Yaprak Sarma 502']
        self.assertEqual(recipe_member['content_type'], 'recipe')
        self.assertEqual(recipe_member['id'], self.recipe_anatolia.id)
        self.assertEqual(recipe_member['author'], 'author_anatolia_502')
        self.assertEqual(recipe_member['region'], 'Anatolia 502')
        self.assertAlmostEqual(recipe_member['latitude'], 39.0)
        self.assertAlmostEqual(recipe_member['longitude'], 35.0)

        story_member = by_title['Kaldolmar from the Empire 502']
        self.assertEqual(story_member['content_type'], 'story')
        self.assertEqual(story_member['id'], self.story_nordic.id)
        self.assertEqual(story_member['author'], 'author_nordic_502')
        self.assertEqual(story_member['region'], 'Nordic 502')
        self.assertAlmostEqual(story_member['latitude'], 60.1)
        self.assertAlmostEqual(story_member['longitude'], 18.6)

    def test_group_detail_nests_journey_steps_in_order(self):
        response = self.client.get(
            reverse('heritage-group-detail', args=[self.group.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        steps = response.data['journey_steps']
        self.assertEqual([s['order'] for s in steps], [1, 2, 3])
        self.assertEqual(
            [s['location'] for s in steps],
            ['Central Asia', 'Anatolia', 'Balkans'],
        )

    # --- GET /api/recipes/<id>/ ---

    def test_recipe_detail_exposes_heritage_group_for_member(self):
        response = self.client.get(
            reverse('recipe-detail', args=[self.recipe_anatolia.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['heritage_group'],
            {'id': self.group.id, 'name': 'Sarma and Dolma Lineage 502'},
        )

    def test_recipe_detail_heritage_group_null_for_non_member(self):
        response = self.client.get(
            reverse('recipe-detail', args=[self.lone_recipe.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['heritage_group'])

    # --- GET /api/stories/<id>/ ---

    def test_story_detail_exposes_heritage_group_for_member(self):
        response = self.client.get(
            reverse('story-detail', args=[self.story_anatolia.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['heritage_group'],
            {'id': self.group.id, 'name': 'Sarma and Dolma Lineage 502'},
        )

    def test_story_detail_heritage_group_null_for_non_member(self):
        story = _story(self.author_lone, self.region_aegean, 'Unlinked Story 502')
        response = self.client.get(reverse('story-detail', args=[story.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['heritage_group'])

    # --- Deleting a recipe member ---

    def test_deleting_recipe_drops_membership_and_member_count(self):
        author = _user('author_temp_delete_502')
        recipe = _recipe(author, self.region_balkan, 'Doomed Sarma 502')
        _add_to_group(self.group, recipe)
        recipe_ct = ContentType.objects.get_for_model(Recipe)

        # Sanity: it is wired up before deletion.
        self.assertTrue(
            HeritageGroupMembership.objects.filter(
                heritage_group=self.group,
                content_type=recipe_ct,
                object_id=recipe.id,
            ).exists()
        )
        list_before = _as_list(self.client.get(reverse('heritage-group-list')).data)
        count_before = next(
            r['member_count'] for r in list_before if r['id'] == self.group.id
        )

        recipe_id = recipe.id
        recipe.delete()

        # The GenericRelation on Recipe cascades the membership row away.
        self.assertFalse(
            HeritageGroupMembership.objects.filter(
                heritage_group=self.group,
                content_type=recipe_ct,
                object_id=recipe_id,
            ).exists()
        )

        # Group is still resolvable and its member count dropped by one.
        list_after_resp = self.client.get(reverse('heritage-group-list'))
        self.assertEqual(list_after_resp.status_code, status.HTTP_200_OK)
        list_after = _as_list(list_after_resp.data)
        count_after = next(
            r['member_count'] for r in list_after if r['id'] == self.group.id
        )
        self.assertEqual(count_after, count_before - 1)

        detail_resp = self.client.get(
            reverse('heritage-group-detail', args=[self.group.id]),
        )
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        member_titles = {m['title'] for m in detail_resp.data['members']}
        self.assertNotIn('Doomed Sarma 502', member_titles)

    # --- Edge cases ---

    def test_group_with_zero_members_is_valid(self):
        response = self.client.get(
            reverse('heritage-group-detail', args=[self.empty_group.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['members'], [])
        self.assertEqual(response.data['journey_steps'], [])

    def test_group_with_single_member(self):
        response = self.client.get(
            reverse('heritage-group-detail', args=[self.single_group.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        members = response.data['members']
        self.assertEqual(len(members), 1)
        self.assertEqual(members[0]['title'], 'Lonely Dolma 502')
        self.assertEqual(members[0]['content_type'], 'recipe')

    def test_member_without_coordinates_still_listed(self):
        response = self.client.get(
            reverse('heritage-group-detail', args=[self.group.id]),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_title = {m['title']: m for m in response.data['members']}
        self.assertIn('Sarma With No Map Pin 502', by_title)
        coordless = by_title['Sarma With No Map Pin 502']
        self.assertEqual(coordless['region'], 'Coordless Region 502')
        self.assertIsNone(coordless['latitude'])
        self.assertIsNone(coordless['longitude'])

    # --- GET /api/heritage-journey-steps/?heritage_group=<id> ---

    def test_journey_steps_filtered_by_group_in_order(self):
        response = self.client.get(
            reverse('heritage-journey-step-list'),
            {'heritage_group': self.group.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        steps = _as_list(response.data)
        self.assertEqual([s['order'] for s in steps], [1, 2, 3])
        self.assertEqual(
            [s['location'] for s in steps],
            ['Central Asia', 'Anatolia', 'Balkans'],
        )
        self.assertTrue(all(s['heritage_group'] == self.group.id for s in steps))

    def test_journey_steps_empty_for_group_without_steps(self):
        response = self.client.get(
            reverse('heritage-journey-step-list'),
            {'heritage_group': self.empty_group.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(_as_list(response.data), [])

    # --- GET /api/cultural-facts/random/ ---

    def test_cultural_facts_random_returns_fact_when_present(self):
        response = self.client.get(reverse('cultural-fact-random'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(response.data['id'], {self.fact_a.id, self.fact_b.id})
        self.assertIn('text', response.data)
        self.assertIn('heritage_group', response.data)
        self.assertIn('region', response.data)

    def test_cultural_facts_random_404_when_empty(self):
        CulturalFact.objects.all().delete()
        response = self.client.get(reverse('cultural-fact-random'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
