from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.personalization import has_profile_terms
from apps.recipes.models import Recipe, Region
from apps.stories.models import Story, StoryRecipeLink

User = get_user_model()


class PersonalizationRefinementTest(TestCase):
    """End-to-end coverage for opt-out, anonymous behavior, and the
    recommendations endpoint introduced alongside ranking."""

    def setUp(self):
        self.client = APIClient()
        self.region, _ = Region.objects.get_or_create(name='Mediterranean')
        self.user_with_profile = User.objects.create_user(
            username='profi',
            email='profi@example.com',
            password='password',
            regional_ties=['Mediterranean'],
            cultural_interests=['Pasta'],
        )
        self.user_no_profile = User.objects.create_user(
            username='noprofi',
            email='noprofi@example.com',
            password='password',
        )
        self.recipe = Recipe.objects.create(
            title='Mediterranean Pasta',
            description='Classic pasta',
            region=self.region,
            author=self.user_no_profile,
            is_published=True,
        )
        self.story = Story.objects.create(
            title='My Pasta Story',
            body='I love pasta',
            author=self.user_no_profile,
            region=self.region,
            is_published=True,
        )
        StoryRecipeLink.objects.create(story=self.story, recipe=self.recipe, order=0)

    def test_anonymous_user_no_ranking(self):
        response = self.client.get('/api/recipes/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        for item in response.data['results']:
            self.assertEqual(item.get('rank_score', 0), 0)

    def test_personalize_opt_out(self):
        self.client.force_authenticate(user=self.user_with_profile)

        res_on = self.client.get('/api/recipes/')
        res_off = self.client.get('/api/recipes/?personalize=0')

        self.assertEqual(res_on.status_code, 200)
        self.assertEqual(res_off.status_code, 200)

        self.assertGreater(res_on.data['results'][0]['rank_score'], 0)
        self.assertEqual(res_off.data['results'][0]['rank_score'], 0)

    def test_story_response_shape_is_paginated(self):
        response = self.client.get('/api/stories/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)

    def test_has_profile_terms_utility(self):
        self.assertTrue(has_profile_terms(self.user_with_profile))
        self.assertFalse(has_profile_terms(self.user_no_profile))

    def test_recommendations_limit_and_surface(self):
        response = self.client.get('/api/recommendations/?limit=1&surface=map')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['surface'], 'map')
