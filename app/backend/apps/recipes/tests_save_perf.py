"""Latency budget tests for the recipe and story save/update paths (#357, M6-06).

Lab 9 / requirement 4.2.3 commits to a 2-second budget for save and update
operations. These tests exercise the realistic write path end to end through
the API (serializer validation, m2m through-table writes, JSON response) and
fail the suite if the median wall time over 5 runs exceeds the budget.
"""
import statistics
import time

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import DeviceToken
from apps.recipes.models import (
    DietaryTag,
    EventTag,
    Ingredient,
    Recipe,
    Region,
    Religion,
    Unit,
)
from apps.stories.models import Story, StoryRecipeLink

User = get_user_model()

SAVE_BUDGET_SECONDS = 2.0
RUNS = 5
RECIPIENT_VOLUME = 50
INGREDIENT_COUNT = 10
DIETARY_TAG_COUNT = 4
EVENT_TAG_COUNT = 2
DESCRIPTION_LENGTH = 500


def _median_seconds(values):
    return statistics.median(values)


def _long_text(prefix, length):
    body = (prefix + ' ') * 200
    return body[:length]


def _seed_volume():
    """Seed lookup tables and a pool of bystander recipients.

    The 50 recipients exist so the user table has realistic volume during
    measurement; the recipe and story save paths do not currently fan out
    notifications via post_save signals, but the table size still affects
    cold-cache query plans for any related lookups in the response phase.
    """
    region, _ = Region.objects.get_or_create(name='Anatolia', defaults={'is_approved': True})
    religion, _ = Religion.objects.get_or_create(name='Secular', defaults={'is_approved': True})

    ingredients = [
        Ingredient.objects.get_or_create(
            name=f'PerfIngredient{i}', defaults={'is_approved': True}
        )[0]
        for i in range(INGREDIENT_COUNT + 2)
    ]
    units = [
        Unit.objects.get_or_create(
            name=f'perfunit{i}', defaults={'is_approved': True}
        )[0]
        for i in range(4)
    ]
    dietary_tags = [
        DietaryTag.objects.get_or_create(
            name=f'PerfDiet{i}', defaults={'is_approved': True}
        )[0]
        for i in range(DIETARY_TAG_COUNT)
    ]
    event_tags = [
        EventTag.objects.get_or_create(
            name=f'PerfEvent{i}', defaults={'is_approved': True}
        )[0]
        for i in range(EVENT_TAG_COUNT)
    ]

    recipients = []
    for i in range(RECIPIENT_VOLUME):
        user = User(email=f'perf_recipient_{i}@example.com', username=f'perf_recipient_{i}')
        user.set_unusable_password()
        recipients.append(user)
    User.objects.bulk_create(recipients)
    recipients = list(User.objects.filter(username__startswith='perf_recipient_'))
    DeviceToken.objects.bulk_create(
        [DeviceToken(user=u, token=f'ExponentPushToken[perf-{u.id}]') for u in recipients]
    )

    return {
        'region': region,
        'religion': religion,
        'ingredients': ingredients,
        'units': units,
        'dietary_tags': dietary_tags,
        'event_tags': event_tags,
    }


class RecipeSavePerfTest(APITestCase):
    """Recipe POST and PATCH must stay under the 2-second budget at the median."""

    @classmethod
    def setUpTestData(cls):
        cls.fixtures = _seed_volume()
        cls.author = User.objects.create_user(
            email='perf_author@example.com',
            username='perf_author',
            password='PerfAuthorPass123!',
        )

    def setUp(self):
        self.client.force_authenticate(user=self.author)
        self.list_url = reverse('recipe-list')

    def _build_create_payload(self, suffix):
        f = self.fixtures
        return {
            'title': f'Perf Recipe {suffix}',
            'description': _long_text('A traditional Anatolian dish made with care.', DESCRIPTION_LENGTH),
            'region': f['region'].id,
            'ingredients_write': [
                {
                    'ingredient': f['ingredients'][i].id,
                    'amount': f'{(i + 1) * 25}.00',
                    'unit': f['units'][i % len(f['units'])].id,
                }
                for i in range(INGREDIENT_COUNT)
            ],
            'dietary_tag_ids': [t.id for t in f['dietary_tags']],
            'event_tag_ids': [t.id for t in f['event_tags']],
            'religion_ids': [f['religion'].id],
        }

    def _build_patch_payload(self, base_payload, run_index):
        f = self.fixtures
        ingredients = [dict(item) for item in base_payload['ingredients_write']]
        ingredients[0]['amount'] = f'{50 + run_index}.00'
        ingredients[1]['amount'] = f'{75 + run_index}.00'
        return {
            'title': f'Perf Recipe edited {run_index}',
            'ingredients_write': ingredients,
            'dietary_tag_ids': [t.id for t in f['dietary_tags']],
            'event_tag_ids': [t.id for t in f['event_tags']],
            'religion_ids': [f['religion'].id],
        }

    def test_recipe_post_under_budget(self):
        timings = []
        for i in range(RUNS):
            payload = self._build_create_payload(f'create-{i}')
            start = time.perf_counter()
            response = self.client.post(self.list_url, payload, format='json')
            timings.append(time.perf_counter() - start)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        median = _median_seconds(timings)
        print(f'\n[perf #357] recipe POST median={median:.3f}s runs={[round(t, 3) for t in timings]}')
        self.assertLess(
            median,
            SAVE_BUDGET_SECONDS,
            f'Recipe POST median {median:.3f}s exceeds budget {SAVE_BUDGET_SECONDS}s. '
            f'All runs: {[round(t, 3) for t in timings]}',
        )

    def test_recipe_patch_under_budget(self):
        recipes = []
        base_payload = self._build_create_payload('patch-base')
        for i in range(RUNS):
            payload = dict(base_payload)
            payload['title'] = f'Perf Recipe patch-base-{i}'
            response = self.client.post(self.list_url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            recipes.append(response.data['id'])

        timings = []
        for i, recipe_id in enumerate(recipes):
            url = reverse('recipe-detail', kwargs={'pk': recipe_id})
            payload = self._build_patch_payload(base_payload, i)
            start = time.perf_counter()
            response = self.client.patch(url, payload, format='json')
            timings.append(time.perf_counter() - start)
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        median = _median_seconds(timings)
        print(f'\n[perf #357] recipe PATCH median={median:.3f}s runs={[round(t, 3) for t in timings]}')
        self.assertLess(
            median,
            SAVE_BUDGET_SECONDS,
            f'Recipe PATCH median {median:.3f}s exceeds budget {SAVE_BUDGET_SECONDS}s. '
            f'All runs: {[round(t, 3) for t in timings]}',
        )


class StorySavePerfTest(APITestCase):
    """Story POST and PATCH must stay under the 2-second budget at the median."""

    @classmethod
    def setUpTestData(cls):
        cls.fixtures = _seed_volume()
        cls.author = User.objects.create_user(
            email='perf_story_author@example.com',
            username='perf_story_author',
            password='PerfAuthorPass123!',
        )
        cls.linked_recipes = []
        for i in range(3):
            recipe = Recipe.objects.create(
                title=f'Perf Linked Recipe {i}',
                description=f'Companion recipe {i} for story perf tests.',
                region=cls.fixtures['region'],
                author=cls.author,
                is_published=True,
            )
            cls.linked_recipes.append(recipe)

    def setUp(self):
        self.client.force_authenticate(user=self.author)
        self.list_url = reverse('story-list')

    def _build_create_payload(self, suffix):
        f = self.fixtures
        return {
            'title': f'Perf Story {suffix}',
            'summary': 'A short summary describing the heritage behind these recipes.',
            'body': _long_text('Stories carry memories across generations.', DESCRIPTION_LENGTH * 2),
            'language': 'en',
            'region': f['region'].id,
            'linked_recipe_ids': [r.id for r in self.linked_recipes],
            'dietary_tag_ids': [t.id for t in f['dietary_tags']],
            'event_tag_ids': [t.id for t in f['event_tags']],
            'religion_ids': [f['religion'].id],
        }

    def _build_patch_payload(self, run_index):
        f = self.fixtures
        return {
            'title': f'Perf Story edited {run_index}',
            'summary': f'Refreshed summary {run_index} after author review.',
            'linked_recipe_ids': [r.id for r in self.linked_recipes],
            'dietary_tag_ids': [t.id for t in f['dietary_tags']],
            'event_tag_ids': [t.id for t in f['event_tags']],
            'religion_ids': [f['religion'].id],
        }

    def test_story_post_under_budget(self):
        timings = []
        for i in range(RUNS):
            payload = self._build_create_payload(f'create-{i}')
            start = time.perf_counter()
            response = self.client.post(self.list_url, payload, format='json')
            timings.append(time.perf_counter() - start)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            self.assertEqual(len(response.data['linked_recipes']), 3)
        median = _median_seconds(timings)
        print(f'\n[perf #357] story POST median={median:.3f}s runs={[round(t, 3) for t in timings]}')
        self.assertLess(
            median,
            SAVE_BUDGET_SECONDS,
            f'Story POST median {median:.3f}s exceeds budget {SAVE_BUDGET_SECONDS}s. '
            f'All runs: {[round(t, 3) for t in timings]}',
        )

    def test_story_patch_under_budget(self):
        story_ids = []
        for i in range(RUNS):
            payload = self._build_create_payload(f'patch-base-{i}')
            response = self.client.post(self.list_url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            story_ids.append(response.data['id'])

        timings = []
        for i, story_id in enumerate(story_ids):
            url = reverse('story-detail', kwargs={'pk': story_id})
            payload = self._build_patch_payload(i)
            start = time.perf_counter()
            response = self.client.patch(url, payload, format='json')
            timings.append(time.perf_counter() - start)
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        median = _median_seconds(timings)
        print(f'\n[perf #357] story PATCH median={median:.3f}s runs={[round(t, 3) for t in timings]}')
        self.assertLess(
            median,
            SAVE_BUDGET_SECONDS,
            f'Story PATCH median {median:.3f}s exceeds budget {SAVE_BUDGET_SECONDS}s. '
            f'All runs: {[round(t, 3) for t in timings]}',
        )
