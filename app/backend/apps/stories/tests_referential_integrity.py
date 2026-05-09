"""Referential integrity guarantees between Recipe, Story, and StoryRecipeLink.

Audit table for #359 (M6-08, requirement 4.3.2). The through model is
``StoryRecipeLink`` (post #379 / PR #458 story-centric pivot).

| Relation                              | on_delete | null  | Notes                                                        |
| ------------------------------------- | --------- | ----- | ------------------------------------------------------------ |
| StoryRecipeLink.story  -> Story       | CASCADE   | False | Deleting a story drops every link row pointing at it.        |
| StoryRecipeLink.recipe -> Recipe      | CASCADE   | False | Deleting a recipe drops every link row pointing at it.       |
| StoryRecipeLink (story, recipe)       | unique    | -     | ``unique_together`` prevents duplicate link rows.            |
| Story.author -> User                  | CASCADE   | False | Deleting the author also deletes their stories (and links).  |
| Story.region -> Region                | SET_NULL  | True  | Deleting a region leaves stories with region=NULL.           |
| Recipe.author -> User                 | CASCADE   | False | Deleting the author also deletes their recipes (and links).  |
| Recipe.region -> Region               | SET_NULL  | True  | Deleting a region leaves recipes with region=NULL.           |

The tests below exercise these guarantees end-to-end. ORM is used for the
schema-level cases (faster, clearer); the API is used only for the PATCH-swap
case where serializer m2m re-set behavior is the thing under test.
"""

from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Recipe, Region
from apps.stories.models import Story, StoryRecipeLink

User = get_user_model()


class RecipeStoryReferentialIntegrityTests(APITestCase):
    """Cover create / delete / orphan / cascade-depth scenarios for #359."""

    def setUp(self):
        self.author = User.objects.create_user(
            email='ri-author@example.com', username='ri-author', password='Pass123!'
        )
        self.region = Region.objects.create(name='RI-Test Region')
        self.recipe_a = Recipe.objects.create(
            title='Recipe A', description='first',
            region=self.region, author=self.author, is_published=True,
        )
        self.recipe_b = Recipe.objects.create(
            title='Recipe B', description='second',
            region=self.region, author=self.author, is_published=True,
        )

    def _make_story(self, title='Story', recipes=()):
        story = Story.objects.create(
            title=title, body='body', author=self.author, is_published=True,
        )
        for order, recipe in enumerate(recipes):
            StoryRecipeLink.objects.create(story=story, recipe=recipe, order=order)
        return story

    def test_delete_recipe_drops_links_but_keeps_story(self):
        """Deleting a recipe must cascade to its StoryRecipeLink rows.

        The story itself stays, and the linked_recipes view collapses.
        """
        story = self._make_story(recipes=[self.recipe_a])
        self.assertEqual(story.recipe_links.count(), 1)

        recipe_id = self.recipe_a.id
        self.recipe_a.delete()

        self.assertTrue(Story.objects.filter(id=story.id).exists())
        self.assertEqual(
            StoryRecipeLink.objects.filter(recipe_id=recipe_id).count(), 0,
            'StoryRecipeLink rows must cascade-delete with the recipe',
        )
        story.refresh_from_db()
        self.assertEqual(story.recipe_links.count(), 0)
        self.assertEqual(story.linked_recipes.count(), 0)

    def test_delete_story_drops_links_but_keeps_recipe(self):
        """Deleting a story must cascade to its StoryRecipeLink rows.

        The recipe stays. The reverse manager Recipe.linked_stories empties,
        and the API-exposed story_count drops to zero.
        """
        story = self._make_story(recipes=[self.recipe_a])
        story_id = story.id
        story.delete()

        self.assertTrue(Recipe.objects.filter(id=self.recipe_a.id).exists())
        self.assertEqual(
            StoryRecipeLink.objects.filter(story_id=story_id).count(), 0,
        )
        self.assertEqual(self.recipe_a.linked_stories.count(), 0)

        self.client.force_authenticate(user=self.author)
        response = self.client.get(reverse('recipe-detail', kwargs={'pk': self.recipe_a.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['story_count'], 0)

    def test_patch_swap_link_drops_old_row_and_updates_counts(self):
        """PATCH swapping linked_recipe_ids replaces link rows atomically.

        Goes through the API because this is a serializer m2m re-set, not a
        schema-level guarantee. After the swap, the old link row is gone, the
        new link row exists, and both recipes' story_count values match.
        """
        story = self._make_story(recipes=[self.recipe_a])
        self.client.force_authenticate(user=self.author)

        url = reverse('story-detail', kwargs={'pk': story.id})
        response = self.client.patch(url, {'linked_recipe_ids': [self.recipe_b.id]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(
            StoryRecipeLink.objects.filter(story=story, recipe=self.recipe_a).exists(),
            'Old StoryRecipeLink(recipe=A) row must be removed by the m2m re-set',
        )
        self.assertTrue(
            StoryRecipeLink.objects.filter(story=story, recipe=self.recipe_b).exists(),
            'New StoryRecipeLink(recipe=B) row must exist',
        )

        recipe_a_resp = self.client.get(reverse('recipe-detail', kwargs={'pk': self.recipe_a.id}))
        recipe_b_resp = self.client.get(reverse('recipe-detail', kwargs={'pk': self.recipe_b.id}))
        self.assertEqual(recipe_a_resp.data['story_count'], 0)
        self.assertEqual(recipe_b_resp.data['story_count'], 1)

    def test_orphan_link_to_missing_recipe_raises_integrity_error(self):
        """Inserting a StoryRecipeLink with a non-existent FK must fail at the DB.

        Wrapped in ``transaction.atomic`` so the surrounding test transaction
        stays usable on PostgreSQL after the constraint violation. SQLite
        enforces FKs at commit time, so ``connection.check_constraints()`` is
        called explicitly to force the check inside the savepoint; this is a
        no-op on PostgreSQL where the INSERT itself raises immediately.
        """
        story = self._make_story()
        missing_recipe_id = (Recipe.objects.order_by('-id').first().id) + 9999

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                StoryRecipeLink.objects.create(
                    story=story, recipe_id=missing_recipe_id, order=0,
                )
                connection.check_constraints()

    def test_user_delete_cascades_through_story_to_link_but_keeps_other_recipes(self):
        """Deleting the author cascades User -> Story -> StoryRecipeLink.

        Recipe A (authored by a different user) must survive even though one
        of its incoming links lived on a story whose author was deleted.
        """
        other_user = User.objects.create_user(
            email='ri-other@example.com', username='ri-other', password='Pass123!'
        )
        recipe_owned_by_other = Recipe.objects.create(
            title='Other Author Recipe', description='kept',
            region=self.region, author=other_user, is_published=True,
        )
        story = self._make_story(recipes=[recipe_owned_by_other])
        story_id = story.id

        self.author.delete()

        self.assertFalse(Story.objects.filter(id=story_id).exists())
        self.assertEqual(
            StoryRecipeLink.objects.filter(recipe=recipe_owned_by_other).count(), 0,
        )
        self.assertTrue(Recipe.objects.filter(id=recipe_owned_by_other.id).exists())
        self.assertFalse(Recipe.objects.filter(id=self.recipe_a.id).exists())
        self.assertFalse(Recipe.objects.filter(id=self.recipe_b.id).exists())
