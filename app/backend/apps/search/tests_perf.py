"""Search latency budget assertions (#355, M6-04).

Lab 9 commits to a 2-second search budget for `/api/search/` (req 4.2.1).
This module seeds realistic volume into the test database, drives the real
DRF endpoint via APIClient, and asserts the median wall-clock latency stays
under SEARCH_BUDGET_SECONDS across the four user-facing query shapes:
plain free-text, domain-aware natural-language, structured filter combo,
and anonymous-unranked vs authenticated-personalized.

A failure here means the search pipeline regressed before the demo, not
during it. Keep SEARCH_BUDGET_SECONDS grep-friendly so the budget surfaces
on a single ripgrep.
"""
import statistics
import time

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.recipes.models import DietaryTag, EventTag, Recipe, Region, Religion
from apps.stories.models import Story

SEARCH_BUDGET_SECONDS = 2.0
RUNS_PER_SCENARIO = 5

User = get_user_model()


class SearchLatencyBudgetTest(APITestCase):
    """Asserts /api/search/ stays under the Lab 9 budget at realistic volume."""

    @classmethod
    def setUpTestData(cls):
        cls.search_url = reverse('global_search')

        cls.regions = [
            cls._approved(Region, name)
            for name in ('Mediterranean', 'Balkan', 'Anatolian', 'Levantine', 'Black Sea')
        ]
        cls.events = [
            cls._approved(EventTag, name)
            for name in ('Wedding', 'Birthday', 'Graduation', 'Anniversary')
        ]
        cls.diets = [
            cls._approved(DietaryTag, name)
            for name in ('Vegetarian', 'Vegan', 'Halal', 'Gluten-Free')
        ]
        cls.religions = [
            cls._approved(Religion, name)
            for name in ('Islam', 'Christianity', 'Judaism')
        ]

        cls.author = User.objects.create_user(
            email='perf-author@example.com',
            username='perfauthor',
            password='Pass12345!',
        )
        cls.viewer = User.objects.create_user(
            email='perf-viewer@example.com',
            username='perfviewer',
            password='Pass12345!',
            cultural_interests=['turkish cuisine', 'mediterranean'],
            regional_ties=['Mediterranean', 'Balkan'],
            religious_preferences=['Islam'],
            event_interests=['Wedding'],
        )

        cls._seed_recipes(count=250)
        cls._seed_stories(count=120)

    @classmethod
    def _approved(cls, model, name):
        obj, _ = model.objects.get_or_create(name=name, defaults={'is_approved': True})
        if not obj.is_approved:
            obj.is_approved = True
            obj.save(update_fields=['is_approved'])
        return obj

    @classmethod
    def _seed_recipes(cls, count):
        keywords = (
            'Mercimek', 'Köfte', 'Pilav', 'Dolma', 'Lahmacun',
            'Manti', 'Pide', 'Baklava', 'Borek', 'Kebap',
        )
        for i in range(count):
            region = cls.regions[i % len(cls.regions)]
            keyword = keywords[i % len(keywords)]
            recipe = Recipe.objects.create(
                title=f'{keyword} variant {i:03d}',
                description=(
                    f'A traditional {region.name} preparation of {keyword}. '
                    'Slow simmered with onion, garlic, tomato paste, cumin, and '
                    'a hint of paprika; finished with parsley and olive oil. '
                    'Best served warm with crusty bread, a wedge of lemon, and '
                    'a side of pickled vegetables. Serves four to six.'
                ),
                region=region,
                author=cls.author,
                is_published=True,
            )
            recipe.event_tags.add(cls.events[i % len(cls.events)])
            recipe.dietary_tags.add(cls.diets[i % len(cls.diets)])
            recipe.religions.add(cls.religions[i % len(cls.religions)])

    @classmethod
    def _seed_stories(cls, count):
        topics = ('Wedding', 'Childhood', 'Holiday', 'Migration', 'Festival')
        for i in range(count):
            region = cls.regions[i % len(cls.regions)]
            topic = topics[i % len(topics)]
            story = Story.objects.create(
                title=f'{topic} memory {i:03d} from {region.name}',
                body=(
                    f'A short reflection about a {topic.lower()} in {region.name}. '
                    'Family gathered at the long table while grandmother plated the '
                    'food, telling the same jokes year after year. The smells of '
                    'cumin and rose water filled the kitchen, and we argued about '
                    'the proper way to fold dolma leaves and roll borek.'
                ),
                region=region,
                author=cls.author,
                is_published=True,
            )
            story.event_tags.add(cls.events[i % len(cls.events)])
            story.dietary_tags.add(cls.diets[i % len(cls.diets)])
            story.religions.add(cls.religions[i % len(cls.religions)])

    def _measure_median(self, params, *, authenticated):
        client = APIClient()
        if authenticated:
            client.force_authenticate(user=self.viewer)
        durations = []
        for _ in range(RUNS_PER_SCENARIO):
            start = time.perf_counter()
            response = client.get(self.search_url, params)
            durations.append(time.perf_counter() - start)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        return statistics.median(durations)

    def test_plain_query_under_budget(self):
        median = self._measure_median({'q': 'mercimek'}, authenticated=True)
        print(f"[search-perf] q=mercimek auth+ranked median={median:.3f}s")
        self.assertLess(median, SEARCH_BUDGET_SECONDS)

    def test_domain_aware_query_under_budget(self):
        median = self._measure_median(
            {'q': 'Balkan wedding dishes'}, authenticated=True,
        )
        print(f"[search-perf] q='Balkan wedding dishes' auth+ranked median={median:.3f}s")
        self.assertLess(median, SEARCH_BUDGET_SECONDS)

    def test_filter_combo_under_budget(self):
        median = self._measure_median(
            {'region': 'Mediterranean', 'event': 'Wedding', 'diet': 'Vegetarian'},
            authenticated=True,
        )
        print(f"[search-perf] filter region+event+diet auth+ranked median={median:.3f}s")
        self.assertLess(median, SEARCH_BUDGET_SECONDS)

    def test_anonymous_vs_authenticated_under_budget(self):
        anon = self._measure_median({'q': 'pilav'}, authenticated=False)
        ranked = self._measure_median({'q': 'pilav'}, authenticated=True)
        print(f"[search-perf] q=pilav anonymous unranked median={anon:.3f}s")
        print(f"[search-perf] q=pilav authenticated ranked median={ranked:.3f}s")
        self.assertLess(max(anon, ranked), SEARCH_BUDGET_SECONDS)
