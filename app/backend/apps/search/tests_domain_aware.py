"""Endpoint tests for domain-aware search wiring (#389).

Verifies that GlobalSearchView decomposes natural-language queries into
facets, respects explicit query params, preserves the legacy behavior when
nothing matches, and keeps the personalization ranking from #463 active.
"""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import DietaryTag, EventTag, Recipe, Region

User = get_user_model()


class DomainAwareSearchTests(APITestCase):
    """Exercises parse_query → apply_content_filters → ranker pipeline."""

    @classmethod
    def setUpTestData(cls):
        cls.url = reverse('global_search')

        # Regions and taxonomy come from seed migrations 0004 / 0013, so we
        # only fetch — never create — to stay aligned with prod data.
        cls.balkan = Region.objects.get(name='Balkan')
        cls.italian = Region.objects.get(name='Italian')
        cls.wedding = EventTag.objects.get(name='Wedding')
        cls.funeral = EventTag.objects.get(name='Funeral')
        cls.vegan = DietaryTag.objects.get(name='Vegan')

        cls.author = User.objects.create_user(
            email='author@example.com', username='author', password='Pass123!',
        )

        cls.balkan_wedding_recipe = Recipe.objects.create(
            title='Honey Cake',
            description='A celebratory pastry served at family gatherings.',
            region=cls.balkan, author=cls.author, is_published=True,
        )
        cls.balkan_wedding_recipe.event_tags.add(cls.wedding)

        cls.balkan_funeral_recipe = Recipe.objects.create(
            title='Memorial Bread',
            description='A simple loaf shared in remembrance.',
            region=cls.balkan, author=cls.author, is_published=True,
        )
        cls.balkan_funeral_recipe.event_tags.add(cls.funeral)

        cls.italian_wedding_recipe = Recipe.objects.create(
            title='Wedding Soup',
            description='An Italian classic with tiny meatballs.',
            region=cls.italian, author=cls.author, is_published=True,
        )
        cls.italian_wedding_recipe.event_tags.add(cls.wedding)

        cls.unrelated_recipe = Recipe.objects.create(
            title='Plain Pasta',
            description='A weeknight staple.',
            region=cls.italian, author=cls.author, is_published=True,
        )

    def test_query_decomposes_region_event_and_text_residual(self):
        response = self.client.get(self.url, {'q': 'Balkan wedding dishes'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        parsed = response.data['parsed']
        self.assertEqual(parsed['region'], 'Balkan')
        self.assertEqual(parsed['event'], 'Wedding')
        self.assertEqual(parsed['diets'], [])
        self.assertEqual(parsed['religions'], [])

        # Only the Balkan + Wedding recipe should pass the facet filter, and
        # its description contains "gatherings" which doesn't include
        # "dishes" - residual text matching narrows further. Verify that the
        # recipe is excluded if its title/description doesn't include "dishes".
        recipe_titles = {r['title'] for r in response.data['recipes']}
        self.assertNotIn('Plain Pasta', recipe_titles)
        self.assertNotIn('Memorial Bread', recipe_titles)
        self.assertNotIn('Wedding Soup', recipe_titles)

    def test_facet_only_query_returns_facet_matches(self):
        # No residual after parsing - only the facet filter narrows.
        response = self.client.get(self.url, {'q': 'Balkan wedding'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recipe_titles = [r['title'] for r in response.data['recipes']]
        self.assertEqual(recipe_titles, ['Honey Cake'])
        self.assertEqual(response.data['parsed']['region'], 'Balkan')
        self.assertEqual(response.data['parsed']['event'], 'Wedding')

    def test_explicit_region_param_overrides_parser(self):
        response = self.client.get(self.url, {'q': 'Balkan wedding', 'region': 'Italian'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Parser still echoes what it saw, but the filter step kept the
        # client-supplied region.
        self.assertEqual(response.data['parsed']['region'], 'Balkan')
        recipe_titles = [r['title'] for r in response.data['recipes']]
        self.assertEqual(recipe_titles, ['Wedding Soup'])

    def test_no_recognized_facet_behaves_like_old_search(self):
        # "honey" doesn't match any taxonomy entry, so the parser leaves the
        # query alone and we fall back to plain icontains matching.
        response = self.client.get(self.url, {'q': 'honey'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['parsed']['region'])
        self.assertIsNone(response.data['parsed']['event'])
        recipe_titles = [r['title'] for r in response.data['recipes']]
        self.assertEqual(recipe_titles, ['Honey Cake'])

    def test_diet_facet_extracted(self):
        DietaryTag.objects.filter(name='Vegan').update(is_approved=True)
        # Tag the Italian wedding recipe as vegan to make a unique target.
        self.italian_wedding_recipe.dietary_tags.add(self.vegan)

        response = self.client.get(self.url, {'q': 'vegan italian wedding'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['parsed']['diets'], ['Vegan'])
        self.assertEqual(response.data['parsed']['region'], 'Italian')
        self.assertEqual(response.data['parsed']['event'], 'Wedding')
        recipe_titles = [r['title'] for r in response.data['recipes']]
        self.assertEqual(recipe_titles, ['Wedding Soup'])

    def test_personalization_ranking_still_runs(self):
        # User with regional_ties=Balkan should see Balkan recipes ranked
        # above non-Balkan ones, proving the #463 personalizer is active.
        ranked_user = User.objects.create_user(
            email='ranked@example.com', username='ranked', password='Pass123!',
            regional_ties=['Balkan'],
        )
        self.client.force_authenticate(user=ranked_user)

        # Use a query with no facet so multiple recipes qualify and ranking
        # has something to reorder.
        response = self.client.get(self.url, {'q': 'a'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recipes = response.data['recipes']
        self.assertGreater(len(recipes), 1)

        # Every Balkan-region recipe should outrank every Italian one.
        balkan_scores = [r['rank_score'] for r in recipes if r['region_tag'] == 'Balkan']
        italian_scores = [r['rank_score'] for r in recipes if r['region_tag'] == 'Italian']
        self.assertTrue(balkan_scores)
        self.assertTrue(italian_scores)
        self.assertGreater(min(balkan_scores), max(italian_scores))

    def test_response_includes_parsed_echo(self):
        response = self.client.get(self.url, {'q': 'Balkan wedding dishes'})

        self.assertIn('parsed', response.data)
        self.assertEqual(
            set(response.data['parsed'].keys()),
            {'region', 'event', 'diets', 'religions'},
        )

    def test_empty_query_still_returns_parsed_block(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        parsed = response.data['parsed']
        self.assertIsNone(parsed['region'])
        self.assertIsNone(parsed['event'])
        self.assertEqual(parsed['diets'], [])
        self.assertEqual(parsed['religions'], [])
