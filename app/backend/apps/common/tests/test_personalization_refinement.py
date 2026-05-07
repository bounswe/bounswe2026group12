from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.recipes.models import Recipe, Region
from apps.stories.models import Story
from apps.common.personalization import has_profile_terms

User = get_user_model()

class PersonalizationRefinementTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.region, _ = Region.objects.get_or_create(name="Mediterranean")
        self.user_with_profile = User.objects.create_user(
            username="profi", email="profi@example.com", password="password",
            regional_ties=["Mediterranean"],
            cultural_interests=["Pasta"]
        )
        self.user_no_profile = User.objects.create_user(
            username="noprofi", email="noprofi@example.com", password="password"
        )
        
        # Create some content
        self.recipe = Recipe.objects.create(
            title="Mediterranean Pasta",
            description="Classic pasta",
            region=self.region,
            author=self.user_no_profile,
            is_published=True
        )
        self.story = Story.objects.create(
            title="My Pasta Story",
            body="I love pasta",
            linked_recipe=self.recipe,
            author=self.user_no_profile,
            is_published=True
        )

    def test_anonymous_user_no_ranking(self):
        """Anonymous users should get standard response without rank_score=0 explicitly set in logic (defaults to 0)."""
        response = self.client.get('/api/recipes/')
        self.assertEqual(response.status_code, 200)
        # Standard paginated response
        self.assertIn('results', response.data)
        for item in response.data['results']:
            # For anonymous, rank_score should be 0 (default in serializer if not set by rank_items)
            self.assertEqual(item.get('rank_score', 0), 0)

    def test_personalize_opt_out(self):
        """Authenticated user with profile can opt out via ?personalize=0."""
        self.client.force_authenticate(user=self.user_with_profile)
        
        # With personalization
        res_on = self.client.get('/api/recipes/')
        # Without personalization
        res_off = self.client.get('/api/recipes/?personalize=0')
        
        self.assertEqual(res_on.status_code, 200)
        self.assertEqual(res_off.status_code, 200)
        
        # In res_on, Mediterranean Pasta should have a rank_score > 0
        self.assertGreater(res_on.data['results'][0]['rank_score'], 0)
        # In res_off, it should be 0
        self.assertEqual(res_off.data['results'][0]['rank_score'], 0)

    def test_story_response_shape(self):
        """Story list should be paginated {count, next, previous, results}."""
        response = self.client.get('/api/stories/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)

    def test_has_profile_terms_utility(self):
        self.assertTrue(has_profile_terms(self.user_with_profile))
        self.assertFalse(has_profile_terms(self.user_no_profile))

    def test_recommendations_limit_and_surface(self):
        """RecommendationsView should respect limit and accept surface."""
        response = self.client.get('/api/recommendations/?limit=1&surface=map')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['surface'], 'map')
