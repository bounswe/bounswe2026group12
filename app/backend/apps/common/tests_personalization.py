from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.common.personalization import (
    rank_items,
    score_cultural_content,
    score_recipe,
    score_story,
)
from apps.cultural_content.models import CulturalContent
from apps.recipes.models import DietaryTag, EventTag, Recipe, Region
from apps.stories.models import Story

User = get_user_model()


class PersonalizationScoringTest(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            email='author@example.com', username='author', password='Pass123!'
        )
        self.aegean, _ = Region.objects.get_or_create(name='Aegean')
        self.black_sea, _ = Region.objects.get_or_create(name='Black Sea')
        self.halal, _ = DietaryTag.objects.get_or_create(
            name='Halal', defaults={'is_approved': True}
        )
        self.ramadan, _ = EventTag.objects.get_or_create(
            name='Ramadan', defaults={'is_approved': True}
        )

    def test_profileless_user_scores_zero(self):
        recipe = Recipe.objects.create(
            title='Aegean Pilaf',
            description='A family table recipe.',
            region=self.aegean,
            author=self.author,
            is_published=True,
        )
        score, reason = score_recipe(recipe, self.author)
        self.assertEqual(score, 0)
        self.assertIsNone(reason)

    def test_recipe_scoring_is_case_insensitive_and_weighted(self):
        user = User.objects.create_user(
            email='fan@example.com',
            username='fan',
            password='Pass123!',
            regional_ties=['aegean'],
            religious_preferences=['halal'],
            event_interests=['ramadan'],
            cultural_interests=['family table'],
        )
        recipe = Recipe.objects.create(
            title='Aegean Pilaf',
            description='A family table recipe.',
            region=self.aegean,
            author=self.author,
            is_published=True,
        )
        recipe.dietary_tags.set([self.halal])
        recipe.event_tags.set([self.ramadan])

        score, reason = score_recipe(recipe, user)

        self.assertGreater(score, 0)
        self.assertEqual(reason, 'regional_match')

    def test_story_uses_linked_recipe_region_and_tags(self):
        user = User.objects.create_user(
            email='storyfan@example.com',
            username='storyfan',
            password='Pass123!',
            regional_ties=['Black Sea'],
        )
        recipe = Recipe.objects.create(
            title='Anchovy Rice',
            description='Coastal recipe.',
            region=self.black_sea,
            author=self.author,
            is_published=True,
        )
        story = Story.objects.create(
            title='Grandma remembers',
            body='A kitchen memory.',
            author=self.author,
            linked_recipe=recipe,
            is_published=True,
        )

        score, reason = score_story(story, user)

        self.assertGreater(score, 0)
        self.assertEqual(reason, 'regional_match')

    def test_cultural_content_scores_on_tags(self):
        user = User.objects.create_user(
            email='culture@example.com',
            username='culture',
            password='Pass123!',
            event_interests=['Ramadan'],
        )
        content = CulturalContent.objects.create(
            slug='ramadan-table',
            kind=CulturalContent.Kind.TRADITION,
            title='Ramadan Table',
            body='Shared evening meals.',
            cultural_tags=['Ramadan'],
        )

        score, reason = score_cultural_content(content, user)

        self.assertEqual(score, 25)
        self.assertEqual(reason, 'event_match')

    def test_rank_items_tiebreaks_by_recency_then_id(self):
        user = User.objects.create_user(
            email='recent@example.com',
            username='recent',
            password='Pass123!',
            regional_ties=['Aegean'],
        )
        older = Recipe.objects.create(
            title='Older',
            description='Aegean dish.',
            region=self.aegean,
            author=self.author,
            is_published=True,
        )
        newer = Recipe.objects.create(
            title='Newer',
            description='Aegean dish.',
            region=self.aegean,
            author=self.author,
            is_published=True,
        )

        ranked = rank_items([older, newer], user, score_recipe)

        self.assertEqual(ranked[0], newer)
        self.assertEqual(ranked[1], older)
