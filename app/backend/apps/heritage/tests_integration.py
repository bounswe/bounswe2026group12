"""Cross-platform integration tests for Heritage groups (issue #502).

Covers all 8 backend test scenarios from the issue:
  1. Group creation with 3+ recipes and 2+ stories from different regions
  2. GET /api/heritage-groups/ returns correct member_count
  3. GET /api/heritage-groups/<id>/ returns all members with content_type,
     title, author, region, lat/lng
  4. GET /api/recipes/<id>/ for a member recipe returns heritage_group: {id, name}
  5. GET /api/recipes/<id>/ for a non-member recipe returns heritage_group: null
  6. GET /api/stories/<id>/ for a member story returns heritage_group: {id, name}
  7. Deleting a recipe removes its membership without breaking the group
  8. Heritage group with 0 members returns a valid empty response
"""
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

from .models import HeritageGroup, HeritageGroupMembership, HeritageJourneyStep


User = get_user_model()


def _make_user(username):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password='pw12345!',
    )


def _make_region(name, lat, lng):
    region, _ = Region.objects.update_or_create(
        name=name,
        defaults={'latitude': lat, 'longitude': lng, 'is_approved': True},
    )
    return region


def _make_recipe(author, region, title):
    return Recipe.objects.create(
        title=title,
        description=f'Description for {title}.',
        author=author,
        region=region,
        is_published=True,
    )


def _make_story(author, region, title):
    return Story.objects.create(
        title=title,
        body=f'Body text for {title}.',
        author=author,
        region=region,
        is_published=True,
    )


class HeritageIntegrationTests(APITestCase):
    """Scenarios 1–8 from issue #502 backend test plan."""

    @classmethod
    def setUpTestData(cls):
        cls.author_bs = _make_user('author_bs')
        cls.author_ae = _make_user('author_ae')
        cls.author_ba = _make_user('author_ba')
        cls.author_no = _make_user('author_no')
        cls.author_lone = _make_user('author_lone')

        cls.region_bs = _make_region('Black Sea', 41.0, 40.0)
        cls.region_ae = _make_region('Aegean', 38.4, 27.1)
        cls.region_ba = _make_region('Balkan', 42.7, 25.5)
        cls.region_no = _make_region('Nordic', 60.1, 18.6)

        # Scenario 1: group with 4 recipes + 2 stories across 4 regions
        cls.group = HeritageGroup.objects.create(
            name='Sarma / Dolma',
            description='Stuffed and rolled dishes spanning from the Ottoman heartland to Scandinavia.',
        )

        cls.r1 = _make_recipe(cls.author_bs, cls.region_bs, 'Black Sea Sarma')
        cls.r2 = _make_recipe(cls.author_ae, cls.region_ae, 'Aegean Dolma')
        cls.r3 = _make_recipe(cls.author_ba, cls.region_ba, 'Balkan Sarma')
        cls.r4 = _make_recipe(cls.author_no, cls.region_no, 'Swedish Kaldolmar')

        cls.s1 = _make_story(cls.author_bs, cls.region_bs, 'Rolling Sarma by the Sea')
        cls.s2 = _make_story(cls.author_no, cls.region_no, 'Cabbage Rolls from the Empire')

        recipe_ct = ContentType.objects.get_for_model(Recipe)
        story_ct = ContentType.objects.get_for_model(Story)

        for recipe in [cls.r1, cls.r2, cls.r3, cls.r4]:
            HeritageGroupMembership.objects.create(
                heritage_group=cls.group,
                content_type=recipe_ct,
                object_id=recipe.id,
            )
        for story in [cls.s1, cls.s2]:
            HeritageGroupMembership.objects.create(
                heritage_group=cls.group,
                content_type=story_ct,
                object_id=story.id,
            )

        HeritageJourneyStep.objects.create(
            heritage_group=cls.group, order=1,
            location='Central Asia', story='Origin in the steppe.', era='Pre-Islamic',
        )
        HeritageJourneyStep.objects.create(
            heritage_group=cls.group, order=2,
            location='Anatolia', story='Grape leaves and rice.', era='Ottoman',
        )

        # Standalone recipe — not in any heritage group (scenario 5)
        cls.lone_recipe = _make_recipe(
            cls.author_lone, cls.region_bs, 'Standalone Kuymak',
        )

        # Empty group — for scenario 8
        cls.empty_group = HeritageGroup.objects.create(
            name='Empty Heritage Group',
            description='No members yet.',
        )

    # --- Scenario 2 ---
    def test_list_returns_correct_member_count(self):
        url = reverse('heritage-group-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = (
            response.data['results']
            if isinstance(response.data, dict)
            else response.data
        )
        row = next(r for r in results if r['id'] == self.group.id)
        self.assertEqual(row['member_count'], 6)  # 4 recipes + 2 stories

    # --- Scenario 3 ---
    def test_detail_returns_all_members_with_full_payload(self):
        url = reverse('heritage-group-detail', args=[self.group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        members = response.data['members']
        self.assertEqual(len(members), 6)

        content_types = {m['content_type'] for m in members}
        self.assertEqual(content_types, {'recipe', 'story'})

        bs_recipe = next(
            m for m in members
            if m['content_type'] == 'recipe' and m['title'] == 'Black Sea Sarma'
        )
        self.assertEqual(bs_recipe['author'], 'author_bs')
        self.assertEqual(bs_recipe['region'], 'Black Sea')
        self.assertEqual(float(bs_recipe['latitude']), 41.0)
        self.assertEqual(float(bs_recipe['longitude']), 40.0)

        story_member = next(
            m for m in members
            if m['content_type'] == 'story'
            and m['title'] == 'Rolling Sarma by the Sea'
        )
        self.assertEqual(story_member['author'], 'author_bs')
        self.assertEqual(story_member['region'], 'Black Sea')

    def test_detail_nests_journey_steps_in_order(self):
        url = reverse('heritage-group-detail', args=[self.group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        steps = response.data['journey_steps']
        self.assertEqual(len(steps), 2)
        self.assertEqual([s['order'] for s in steps], [1, 2])
        self.assertEqual(steps[0]['location'], 'Central Asia')
        self.assertEqual(steps[1]['location'], 'Anatolia')

    def test_detail_members_span_at_least_three_regions(self):
        url = reverse('heritage-group-detail', args=[self.group.id])
        response = self.client.get(url)
        regions = {m['region'] for m in response.data['members'] if m['region']}
        self.assertGreaterEqual(
            len(regions), 3,
            f'Expected members from 3+ regions, got {regions}',
        )

    # --- Scenario 4 ---
    def test_recipe_detail_returns_heritage_group_when_member(self):
        url = reverse('recipe-detail', args=[self.r1.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['heritage_group'], {
            'id': self.group.id,
            'name': 'Sarma / Dolma',
        })

    # --- Scenario 5 ---
    def test_recipe_detail_returns_null_heritage_group_when_not_member(self):
        url = reverse('recipe-detail', args=[self.lone_recipe.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['heritage_group'])

    # --- Scenario 6 ---
    def test_story_detail_returns_heritage_group_when_member(self):
        url = reverse('story-detail', args=[self.s1.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['heritage_group'], {
            'id': self.group.id,
            'name': 'Sarma / Dolma',
        })

    # --- Scenario 7 ---
    def test_deleting_recipe_skipped_in_members_group_remains_intact(self):
        # Use a fresh recipe so deletion does not affect shared test data.
        author = _make_user('temp_author_del')
        recipe = _make_recipe(author, self.region_bs, 'Temporary Deletion Test Sarma')
        ct = ContentType.objects.get_for_model(Recipe)
        HeritageGroupMembership.objects.create(
            heritage_group=self.group,
            content_type=ct,
            object_id=recipe.id,
        )

        recipe_id = recipe.id
        recipe.delete()

        # The GenericFK membership row is orphaned (no DB-level cascade from
        # Recipe → HeritageGroupMembership). The detail serializer skips
        # unresolvable rows at serializers.py line ~81.
        url = reverse('heritage-group-detail', args=[self.group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        titles = {m['title'] for m in response.data['members']}
        self.assertNotIn('Temporary Deletion Test Sarma', titles)

        ids = {m['id'] for m in response.data['members']}
        self.assertNotIn(recipe_id, ids)

    # --- Scenario 8 ---
    def test_empty_group_detail_returns_empty_members_and_steps(self):
        url = reverse('heritage-group-detail', args=[self.empty_group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['members'], [])
        self.assertEqual(response.data['journey_steps'], [])

    def test_empty_group_list_shows_zero_member_count(self):
        url = reverse('heritage-group-list')
        response = self.client.get(url)
        results = (
            response.data['results']
            if isinstance(response.data, dict)
            else response.data
        )
        row = next(r for r in results if r['id'] == self.empty_group.id)
        self.assertEqual(row['member_count'], 0)
