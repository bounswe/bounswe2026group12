from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

from .models import HeritageGroup, HeritageGroupMembership


User = get_user_model()


def _make_user(username='heritage_user'):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password='pw12345!',
    )


def _make_recipe(author, region=None, title='Sarma'):
    return Recipe.objects.create(
        title=title,
        description='Stuffed grape leaves.',
        region=region,
        author=author,
        is_published=True,
    )


def _make_story(author, title='Sarma in Anatolia', region=None):
    return Story.objects.create(
        title=title,
        body='Memories of rolling sarma with grandma.',
        author=author,
        region=region,
        is_published=True,
    )


class HeritageGroupModelTests(APITestCase):
    def test_name_is_unique(self):
        HeritageGroup.objects.create(name='Sarma / Dolma')
        with self.assertRaises(IntegrityError):
            HeritageGroup.objects.create(name='Sarma / Dolma')

    def test_membership_unique_together(self):
        author = _make_user()
        recipe = _make_recipe(author)
        group = HeritageGroup.objects.create(name='Sarma / Dolma')
        ct = ContentType.objects.get_for_model(Recipe)
        HeritageGroupMembership.objects.create(
            heritage_group=group, content_type=ct, object_id=recipe.id,
        )
        with self.assertRaises(IntegrityError):
            HeritageGroupMembership.objects.create(
                heritage_group=group, content_type=ct, object_id=recipe.id,
            )

    def test_generic_relation_roundtrip_recipe_and_story(self):
        author = _make_user()
        recipe = _make_recipe(author)
        story = _make_story(author)
        group = HeritageGroup.objects.create(name='Sarma / Dolma')
        recipe_ct = ContentType.objects.get_for_model(Recipe)
        story_ct = ContentType.objects.get_for_model(Story)
        HeritageGroupMembership.objects.create(
            heritage_group=group, content_type=recipe_ct, object_id=recipe.id,
        )
        HeritageGroupMembership.objects.create(
            heritage_group=group, content_type=story_ct, object_id=story.id,
        )

        members = list(group.memberships.all())
        self.assertEqual(len(members), 2)
        resolved = {m.content_object for m in members}
        self.assertIn(recipe, resolved)
        self.assertIn(story, resolved)

        # Reverse relation from the target sides
        self.assertEqual(recipe.heritage_memberships.count(), 1)
        self.assertEqual(story.heritage_memberships.count(), 1)


class HeritageGroupAPITests(APITestCase):
    def setUp(self):
        self.author = _make_user()
        self.region = Region.objects.create(
            name='Anatolia', latitude=39.0, longitude=35.0, is_approved=True,
        )
        self.recipe = _make_recipe(self.author, region=self.region)
        self.story = _make_story(self.author, region=self.region)
        self.group = HeritageGroup.objects.create(
            name='Sarma / Dolma',
            description='Grape-leaf rolls across Anatolia, Greece, and the Levant.',
        )
        recipe_ct = ContentType.objects.get_for_model(Recipe)
        story_ct = ContentType.objects.get_for_model(Story)
        HeritageGroupMembership.objects.create(
            heritage_group=self.group, content_type=recipe_ct, object_id=self.recipe.id,
        )
        HeritageGroupMembership.objects.create(
            heritage_group=self.group, content_type=story_ct, object_id=self.story.id,
        )

    def test_list_returns_member_count(self):
        url = reverse('heritage-group-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        match = next((row for row in results if row['id'] == self.group.id), None)
        self.assertIsNotNone(match)
        self.assertEqual(match['name'], 'Sarma / Dolma')
        self.assertEqual(match['member_count'], 2)

    def test_detail_returns_recipe_and_story_members(self):
        url = reverse('heritage-group-detail', args=[self.group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Sarma / Dolma')

        members = response.data['members']
        self.assertEqual(len(members), 2)
        kinds = {m['content_type'] for m in members}
        self.assertEqual(kinds, {'recipe', 'story'})

        recipe_member = next(m for m in members if m['content_type'] == 'recipe')
        self.assertEqual(recipe_member['id'], self.recipe.id)
        self.assertEqual(recipe_member['title'], self.recipe.title)
        self.assertEqual(recipe_member['author'], self.author.username)
        self.assertEqual(recipe_member['region'], 'Anatolia')
        self.assertEqual(recipe_member['latitude'], 39.0)
        self.assertEqual(recipe_member['longitude'], 35.0)

    def test_detail_skips_members_with_deleted_target(self):
        # Attach a phantom Recipe id, then verify the response simply skips it.
        recipe_ct = ContentType.objects.get_for_model(Recipe)
        HeritageGroupMembership.objects.create(
            heritage_group=self.group, content_type=recipe_ct, object_id=999_999,
        )
        url = reverse('heritage-group-detail', args=[self.group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Still 2 valid members; the dangling 999_999 row is skipped.
        self.assertEqual(len(response.data['members']), 2)

    def test_detail_404_for_unknown_group(self):
        url = reverse('heritage-group-detail', args=[999_999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_get_allowed(self):
        url = reverse('heritage-group-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_writes_are_rejected(self):
        list_url = reverse('heritage-group-list')
        detail_url = reverse('heritage-group-detail', args=[self.group.id])
        self.client.force_authenticate(user=self.author)

        post = self.client.post(list_url, {'name': 'New'}, format='json')
        self.assertEqual(post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        patch = self.client.patch(detail_url, {'name': 'Renamed'}, format='json')
        self.assertEqual(patch.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        delete = self.client.delete(detail_url)
        self.assertEqual(delete.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class HeritageGroupSerializerIntegrationTests(APITestCase):
    """Recipe / Story serializers must expose a nested heritage_group."""

    def setUp(self):
        self.author = _make_user()
        self.recipe = _make_recipe(self.author)
        self.story = _make_story(self.author)

    def test_recipe_response_has_null_heritage_group_without_membership(self):
        url = reverse('recipe-detail', args=[self.recipe.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('heritage_group', response.data)
        self.assertIsNone(response.data['heritage_group'])

    def test_recipe_response_populates_heritage_group_when_attached(self):
        group = HeritageGroup.objects.create(name='Sarma / Dolma')
        ct = ContentType.objects.get_for_model(Recipe)
        HeritageGroupMembership.objects.create(
            heritage_group=group, content_type=ct, object_id=self.recipe.id,
        )
        url = reverse('recipe-detail', args=[self.recipe.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['heritage_group'], {
            'id': group.id, 'name': 'Sarma / Dolma',
        })

    def test_story_response_has_null_heritage_group_without_membership(self):
        url = reverse('story-detail', args=[self.story.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('heritage_group', response.data)
        self.assertIsNone(response.data['heritage_group'])

    def test_story_response_populates_heritage_group_when_attached(self):
        group = HeritageGroup.objects.create(name='Sarma / Dolma')
        ct = ContentType.objects.get_for_model(Story)
        HeritageGroupMembership.objects.create(
            heritage_group=group, content_type=ct, object_id=self.story.id,
        )
        url = reverse('story-detail', args=[self.story.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['heritage_group'], {
            'id': group.id, 'name': 'Sarma / Dolma',
        })
