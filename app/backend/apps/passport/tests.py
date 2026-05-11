from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Comment, Recipe, Region
from apps.stories.models import Story

from . import services
from .models import (
    CulturalPassport,
    PassportEvent,
    Quest,
    Stamp,
    StampInteraction,
    UserQuest,
)
from .serializers import LEVEL_NAMES

User = get_user_model()


EXPECTED_KEYS = {
    'level',
    'total_points',
    'active_theme',
    'stats',
    'stamps',
    'culture_summaries',
    'timeline',
    'active_quests',
}

EXPECTED_STATS_KEYS = {
    'cultures_count',
    'recipes_tried',
    'stories_saved',
    'heritage_shared',
    'level_name',
}


class CulturalPassportSignalTest(TestCase):
    """Signal-driven default passport row (#583)."""

    def test_user_creation_auto_creates_passport(self):
        user = User.objects.create_user(
            email='signal@example.com',
            username='signaluser',
            password='StrongPass123!',
        )
        self.assertTrue(CulturalPassport.objects.filter(user=user).exists())
        passport = user.passport
        self.assertEqual(passport.level, 1)
        self.assertEqual(passport.total_points, 0)
        self.assertEqual(passport.active_theme, 'classic_traveler')

    def test_signal_is_idempotent_on_resave(self):
        user = User.objects.create_user(
            email='resave@example.com',
            username='resaveuser',
            password='StrongPass123!',
        )
        user.bio = 'updated'
        user.save()
        self.assertEqual(CulturalPassport.objects.filter(user=user).count(), 1)

    def test_backfill_is_idempotent(self):
        """The backfill data migration uses get_or_create, so running its
        body twice on the same user must not create a duplicate row.
        """
        user = User.objects.create_user(
            email='backfill@example.com',
            username='backfilluser',
            password='StrongPass123!',
        )
        CulturalPassport.objects.filter(user=user).delete()
        for _ in range(2):
            CulturalPassport.objects.get_or_create(user=user)
        self.assertEqual(CulturalPassport.objects.filter(user=user).count(), 1)


class PassportEndpointTest(APITestCase):
    """GET /api/users/<username>/passport/ (#583)."""

    def setUp(self):
        self.alice = User.objects.create_user(
            email='alice@example.com',
            username='alice',
            password='StrongPass123!',
        )
        self.bob = User.objects.create_user(
            email='bob@example.com',
            username='bob',
            password='StrongPass123!',
        )

    def test_happy_path_returns_full_shape(self):
        response = self.client.get('/api/users/alice/passport/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), EXPECTED_KEYS)

    def test_default_values_for_new_user(self):
        response = self.client.get('/api/users/alice/passport/')
        self.assertEqual(response.data['level'], 1)
        self.assertEqual(response.data['total_points'], 0)
        self.assertEqual(response.data['active_theme'], 'classic_traveler')

    def test_stats_section_shape_and_level_name(self):
        response = self.client.get('/api/users/alice/passport/')
        stats = response.data['stats']
        self.assertEqual(set(stats.keys()), EXPECTED_STATS_KEYS)
        self.assertEqual(stats['cultures_count'], 0)
        self.assertEqual(stats['recipes_tried'], 0)
        self.assertEqual(stats['stories_saved'], 0)
        self.assertEqual(stats['heritage_shared'], 0)
        self.assertEqual(stats['level_name'], LEVEL_NAMES[1])

    def test_level_name_tracks_level_value(self):
        passport = self.alice.passport
        passport.level = 4
        passport.save()
        response = self.client.get('/api/users/alice/passport/')
        self.assertEqual(response.data['level'], 4)
        self.assertEqual(response.data['stats']['level_name'], LEVEL_NAMES[4])

    def test_stub_sections_are_empty_lists(self):
        response = self.client.get('/api/users/alice/passport/')
        self.assertEqual(response.data['stamps'], [])
        self.assertEqual(response.data['culture_summaries'], [])
        self.assertEqual(response.data['timeline'], [])
        self.assertEqual(response.data['active_quests'], [])

    def test_unknown_username_returns_404(self):
        response = self.client.get('/api/users/ghost/passport/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_visitor_can_read_passport(self):
        # No credentials attached; should still succeed per visitor mode.
        response = self.client.get('/api/users/alice/passport/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), EXPECTED_KEYS)

    def test_authenticated_user_reads_other_users_passport(self):
        login = self.client.post(
            '/api/auth/login/',
            {'email': 'alice@example.com', 'password': 'StrongPass123!'},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')

        bob_passport = self.bob.passport
        bob_passport.level = 3
        bob_passport.total_points = 42
        bob_passport.active_theme = 'aegean_voyager'
        bob_passport.save()

        response = self.client.get('/api/users/bob/passport/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['level'], 3)
        self.assertEqual(response.data['total_points'], 42)
        self.assertEqual(response.data['active_theme'], 'aegean_voyager')

    def test_response_shape_has_no_extra_keys(self):
        response = self.client.get('/api/users/alice/passport/')
        self.assertEqual(set(response.data.keys()), EXPECTED_KEYS)
        self.assertEqual(set(response.data['stats'].keys()), EXPECTED_STATS_KEYS)

    def test_passport_is_created_on_demand_if_missing(self):
        """Defensive: if the backfill missed a user, the endpoint still works."""
        CulturalPassport.objects.filter(user=self.alice).delete()
        response = self.client.get('/api/users/alice/passport/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CulturalPassport.objects.filter(user=self.alice).exists())


def _make_user(username):
    return User.objects.create_user(
        email=f'{username}@example.com',
        username=username,
        password='StrongPass123!',
    )


def _auth(client, username):
    login = client.post(
        '/api/auth/login/',
        {'email': f'{username}@example.com', 'password': 'StrongPass123!'},
    )
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')


class LevelForPointsTest(TestCase):
    """Pure threshold function for the level/points computation (#587)."""

    def test_thresholds(self):
        cases = [
            (0, 1), (29, 1),
            (30, 2), (99, 2),
            (100, 3), (249, 3),
            (250, 4), (499, 4),
            (500, 5), (999, 5),
            (1000, 6), (5000, 6),
        ]
        for points, level in cases:
            self.assertEqual(services.level_for_points(points), level, points)


class StampActionEndpointTest(APITestCase):
    """POST /api/passport/recipes/<id>/try/ and /stories/<id>/save/ (#584)."""

    def setUp(self):
        self.author = _make_user('author')
        self.bob = _make_user('bob')
        self.region = Region.objects.get_or_create(name='Mediterranean')[0]
        self.recipes = [
            Recipe.objects.create(
                title=f'Med Recipe {i}', description='desc',
                author=self.author, region=self.region,
            )
            for i in range(8)
        ]
        self.story = Story.objects.create(
            title='Med Story', body='body', author=self.author, region=self.region,
        )

    def _try(self, recipe):
        return self.client.post(f'/api/passport/recipes/{recipe.pk}/try/')

    def _save(self, story):
        return self.client.post(f'/api/passport/stories/{story.pk}/save/')

    def test_try_requires_auth(self):
        response = self._try(self.recipes[0])
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_save_requires_auth(self):
        response = self._save(self.story)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_first_try_creates_bronze_stamp(self):
        _auth(self.client, 'bob')
        response = self._try(self.recipes[0])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stamps = response.data['affected_stamps']
        self.assertEqual(len(stamps), 1)
        self.assertEqual(stamps[0]['rarity'], Stamp.RARITY_BRONZE)
        self.assertEqual(stamps[0]['category'], Stamp.CATEGORY_RECIPE)
        self.assertEqual(stamps[0]['culture'], 'Mediterranean')
        self.assertEqual(Stamp.objects.filter(user=self.bob).count(), 1)

    def test_three_distinct_tries_upgrade_to_silver(self):
        _auth(self.client, 'bob')
        for i in range(3):
            self._try(self.recipes[i])
        stamp = Stamp.objects.get(user=self.bob, culture='Mediterranean', category=Stamp.CATEGORY_RECIPE)
        self.assertEqual(stamp.rarity, Stamp.RARITY_SILVER)

    def test_seven_interactions_with_a_story_reach_gold(self):
        _auth(self.client, 'bob')
        for i in range(6):
            self._try(self.recipes[i])
        # six tries, no story yet -> silver
        stamp = Stamp.objects.get(user=self.bob, culture='Mediterranean', category=Stamp.CATEGORY_RECIPE)
        self.assertEqual(stamp.rarity, Stamp.RARITY_SILVER)
        self._save(self.story)  # seventh interaction, includes a story -> gold
        stamp.refresh_from_db()
        self.assertEqual(stamp.rarity, Stamp.RARITY_GOLD)
        story_stamp = Stamp.objects.get(user=self.bob, culture='Mediterranean', category=Stamp.CATEGORY_STORY)
        self.assertEqual(story_stamp.rarity, Stamp.RARITY_GOLD)

    def test_try_is_idempotent(self):
        _auth(self.client, 'bob')
        self._try(self.recipes[0])
        points_after_first = CulturalPassport.objects.get(user=self.bob).total_points
        response = self._try(self.recipes[0])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['leveled_up'])
        self.assertEqual(
            StampInteraction.objects.filter(user=self.bob, recipe=self.recipes[0]).count(), 1,
        )
        self.assertEqual(
            CulturalPassport.objects.get(user=self.bob).total_points, points_after_first,
        )

    def test_response_includes_passport_summary(self):
        _auth(self.client, 'bob')
        response = self._try(self.recipes[0])
        for key in (
            'level', 'total_points', 'active_theme', 'stats', 'stamps',
            'culture_summaries', 'timeline', 'active_quests',
            'leveled_up', 'new_level', 'previous_level', 'affected_stamps',
            'newly_completed_quests',
        ):
            self.assertIn(key, response.data)
        self.assertEqual(len(response.data['stamps']), 1)
        self.assertEqual(len(response.data['timeline']), 2)  # recipe_tried + stamp_earned

    def test_save_story_creates_story_stamp(self):
        _auth(self.client, 'bob')
        response = self._save(self.story)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stamp = Stamp.objects.get(user=self.bob, culture='Mediterranean')
        self.assertEqual(stamp.category, Stamp.CATEGORY_STORY)

    def test_recipe_id_accepts_public_id(self):
        _auth(self.client, 'bob')
        response = self.client.post(f'/api/passport/recipes/{self.recipes[0].public_id}/try/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class PassportPointsTest(TestCase):
    """recalculate_passport_points weights and side effects (#587)."""

    def setUp(self):
        self.author = _make_user('author')
        self.bob = _make_user('bob')
        self.region = Region.objects.get_or_create(name='Anatolia')[0]

    def _recipe(self, **kwargs):
        defaults = dict(title='R', description='d', author=self.author, region=self.region)
        defaults.update(kwargs)
        return Recipe.objects.create(**defaults)

    def test_recipe_try_awards_tried_and_saved_weights(self):
        services.record_recipe_try(self.bob, self._recipe())
        self.bob.refresh_from_db()
        self.assertEqual(self.bob.passport.total_points, 7)  # 5 tried + 2 saved-to-passport

    def test_story_save_awards_story_weight(self):
        story = Story.objects.create(title='S', body='b', author=self.author, region=self.region)
        services.record_story_save(self.bob, story)
        self.bob.refresh_from_db()
        self.assertEqual(self.bob.passport.total_points, 3)

    def test_comment_submission_awards_one_point(self):
        recipe = self._recipe()
        Comment.objects.create(recipe=recipe, author=self.bob, body='nice')
        self.bob.refresh_from_db()
        self.assertEqual(self.bob.passport.total_points, 1)

    def test_heritage_recipe_share_awards_points_and_writes_event(self):
        self._recipe(is_heritage=True, author=self.author)
        self.author.refresh_from_db()
        # 15 (heritage shared) + 12 (emerald stamp, author contributed to the culture)
        self.assertEqual(self.author.passport.total_points, 27)
        self.assertEqual(
            PassportEvent.objects.filter(user=self.author, event_type=PassportEvent.TYPE_HERITAGE_SHARED).count(), 1,
        )
        self.assertTrue(Stamp.objects.filter(user=self.author, rarity=Stamp.RARITY_EMERALD).exists())

    def test_gold_stamp_contributes_points(self):
        for _ in range(6):
            services.record_recipe_try(self.bob, self._recipe())
        story = Story.objects.create(title='S', body='b', author=self.author, region=self.region)
        services.record_story_save(self.bob, story)
        self.bob.refresh_from_db()
        # 6 tries * 7 = 42, 1 story = 3, two gold stamps = 16  -> 61
        self.assertEqual(Stamp.objects.filter(user=self.bob, rarity=Stamp.RARITY_GOLD).count(), 2)
        self.assertEqual(self.bob.passport.total_points, 61)

    def test_emerald_stamp_via_own_content(self):
        Story.objects.create(title='Mine', body='b', author=self.bob, region=self.region)
        services.record_recipe_try(self.bob, self._recipe())
        self.bob.refresh_from_db()
        stamp = Stamp.objects.get(user=self.bob, culture='Anatolia')
        self.assertEqual(stamp.rarity, Stamp.RARITY_EMERALD)
        # 1 try * 7 = 7, emerald stamp = 12 -> 19
        self.assertEqual(self.bob.passport.total_points, 19)

    def test_legendary_stamp_via_heritage_recipe_with_video(self):
        recipe = self._recipe(is_heritage=True, video='recipes/videos/clip.mp4', author=self.author)
        services.record_recipe_try(self.bob, recipe)
        self.bob.refresh_from_db()
        stamp = Stamp.objects.get(user=self.bob, culture='Anatolia')
        self.assertEqual(stamp.rarity, Stamp.RARITY_LEGENDARY)
        # 1 try * 7 = 7, legendary stamp = 25 -> 32
        self.assertEqual(self.bob.passport.total_points, 32)

    def test_action_writes_level_up_event_on_transition(self):
        for _ in range(5):
            services.record_recipe_try(self.bob, self._recipe())
        self.bob.refresh_from_db()
        # 5 tries * 7 = 35 -> level 2
        self.assertEqual(self.bob.passport.total_points, 35)
        self.assertEqual(self.bob.passport.level, 2)
        events = PassportEvent.objects.filter(user=self.bob, event_type=PassportEvent.TYPE_LEVEL_UP)
        self.assertEqual(events.count(), 1)
        self.assertIn('Level 2', events.first().description)


class QuestProgressTest(TestCase):
    """Quest + UserQuest progress and rewards (#586)."""

    def setUp(self):
        self.author = _make_user('author')
        self.bob = _make_user('bob')
        self.region = Region.objects.get_or_create(name='Aegean')[0]
        self.recipes = [
            Recipe.objects.create(title=f'A{i}', description='d', author=self.author, region=self.region)
            for i in range(3)
        ]

    def test_progress_increments_and_completes(self):
        quest = Quest.objects.create(
            name='Aegean Explorer', category=Quest.CATEGORY_DISCOVERY,
            target_count=2, reward_type=Quest.REWARD_POINTS,
            filter_criteria={'region': 'Aegean'},
        )
        services.record_recipe_try(self.bob, self.recipes[0])
        uq = UserQuest.objects.get(user=self.bob, quest=quest)
        self.assertEqual(uq.progress, 1)
        self.assertIsNone(uq.completed_at)
        services.record_recipe_try(self.bob, self.recipes[1])
        uq.refresh_from_db()
        self.assertEqual(uq.progress, 2)
        self.assertIsNotNone(uq.completed_at)
        self.assertTrue(uq.reward_claimed)
        self.assertEqual(
            PassportEvent.objects.filter(user=self.bob, event_type=PassportEvent.TYPE_QUEST_COMPLETED).count(), 1,
        )

    def test_quest_does_not_match_other_region(self):
        Quest.objects.create(
            name='Nordic', category=Quest.CATEGORY_DISCOVERY, target_count=1,
            reward_type=Quest.REWARD_POINTS, filter_criteria={'region': 'Nordic'},
        )
        services.record_recipe_try(self.bob, self.recipes[0])
        self.assertFalse(UserQuest.objects.filter(user=self.bob).exists())

    def test_theme_reward_applies(self):
        Quest.objects.create(
            name='Theme quest', category=Quest.CATEGORY_JOURNEY, target_count=1,
            reward_type=Quest.REWARD_THEME, reward_value='aegean_voyager',
            filter_criteria={'region': 'Aegean'},
        )
        services.record_recipe_try(self.bob, self.recipes[0])
        self.bob.refresh_from_db()
        self.assertEqual(self.bob.passport.active_theme, 'aegean_voyager')

    def test_stamp_reward_grants_stamp(self):
        Quest.objects.create(
            name='Stamp quest', category=Quest.CATEGORY_COMMUNITY, target_count=1,
            reward_type=Quest.REWARD_STAMP, reward_value='Hidden Coast',
            filter_criteria={'region': 'Aegean'},
        )
        services.record_recipe_try(self.bob, self.recipes[0])
        self.assertTrue(
            Stamp.objects.filter(user=self.bob, culture='Hidden Coast', category=Stamp.CATEGORY_COMMUNITY).exists(),
        )

    def test_quest_completion_awards_points(self):
        Quest.objects.create(
            name='One step', category=Quest.CATEGORY_DISCOVERY, target_count=1,
            reward_type=Quest.REWARD_POINTS, filter_criteria={'region': 'Aegean'},
        )
        services.record_recipe_try(self.bob, self.recipes[0])
        self.bob.refresh_from_db()
        # 1 try * 7 = 7, quest completed = 20 -> 27
        self.assertEqual(self.bob.passport.total_points, 27)

    def test_event_quest_date_filtering(self):
        now = timezone.now()
        quest = Quest.objects.create(
            name='Festival', category=Quest.CATEGORY_DISCOVERY, target_count=1,
            reward_type=Quest.REWARD_POINTS, filter_criteria={'region': 'Aegean'},
            is_event_quest=True,
            event_start=now + timedelta(days=1), event_end=now + timedelta(days=2),
        )
        services.record_recipe_try(self.bob, self.recipes[0])
        self.assertFalse(UserQuest.objects.filter(user=self.bob, quest=quest).exists())
        quest.event_start = now - timedelta(days=1)
        quest.event_end = now + timedelta(days=1)
        quest.save()
        services.record_recipe_try(self.bob, self.recipes[1])
        uq = UserQuest.objects.get(user=self.bob, quest=quest)
        self.assertEqual(uq.progress, 1)
        self.assertIsNotNone(uq.completed_at)


class QuestEndpointTest(APITestCase):
    """GET /api/passport/quests/ (#586)."""

    def setUp(self):
        self.author = _make_user('author')
        self.bob = _make_user('bob')
        self.region = Region.objects.get_or_create(name='Aegean')[0]
        self.recipe = Recipe.objects.create(title='A', description='d', author=self.author, region=self.region)

    def test_requires_auth(self):
        response = self.client.get('/api/passport/quests/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_active_quests_with_progress(self):
        quest = Quest.objects.create(
            name='Aegean Explorer', category=Quest.CATEGORY_DISCOVERY, target_count=3,
            reward_type=Quest.REWARD_POINTS, filter_criteria={'region': 'Aegean'},
        )
        services.record_recipe_try(self.bob, self.recipe)
        _auth(self.client, 'bob')
        response = self.client.get('/api/passport/quests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = {row['id']: row for row in response.data}
        self.assertIn(quest.id, rows)
        self.assertEqual(rows[quest.id]['progress'], 1)
        self.assertEqual(rows[quest.id]['target_count'], 3)

    def test_out_of_window_event_quest_excluded(self):
        now = timezone.now()
        Quest.objects.create(
            name='Past festival', category=Quest.CATEGORY_DISCOVERY, target_count=1,
            reward_type=Quest.REWARD_POINTS, is_event_quest=True,
            event_start=now - timedelta(days=5), event_end=now - timedelta(days=4),
        )
        _auth(self.client, 'bob')
        response = self.client.get('/api/passport/quests/')
        self.assertEqual(response.data, [])


class TimelineTest(APITestCase):
    """PassportEvent timeline and its surfacing in the passport API (#588)."""

    def setUp(self):
        self.author = _make_user('author')
        self.bob = _make_user('bob')
        self.region = Region.objects.get_or_create(name='Levant')[0]
        self.recipe = Recipe.objects.create(title='R', description='d', author=self.author, region=self.region)
        self.story = Story.objects.create(title='S', body='b', author=self.author, region=self.region)

    def test_recipe_try_writes_events(self):
        services.record_recipe_try(self.bob, self.recipe)
        self.assertEqual(
            PassportEvent.objects.filter(user=self.bob, event_type=PassportEvent.TYPE_RECIPE_TRIED).count(), 1,
        )
        earned = PassportEvent.objects.filter(user=self.bob, event_type=PassportEvent.TYPE_STAMP_EARNED)
        self.assertEqual(earned.count(), 1)
        self.assertEqual(earned.first().stamp_rarity, Stamp.RARITY_BRONZE)

    def test_story_save_writes_events(self):
        services.record_story_save(self.bob, self.story)
        self.assertEqual(
            PassportEvent.objects.filter(user=self.bob, event_type=PassportEvent.TYPE_STORY_SAVED).count(), 1,
        )
        self.assertEqual(
            PassportEvent.objects.filter(user=self.bob, event_type=PassportEvent.TYPE_STAMP_EARNED).count(), 1,
        )

    def test_heritage_recipe_writes_heritage_shared_event(self):
        Recipe.objects.create(title='H', description='d', author=self.author, region=self.region, is_heritage=True)
        self.assertEqual(
            PassportEvent.objects.filter(user=self.author, event_type=PassportEvent.TYPE_HERITAGE_SHARED).count(), 1,
        )

    def test_timeline_trims_to_50_newest_first(self):
        base = timezone.now()
        for i in range(55):
            PassportEvent.objects.create(
                user=self.bob, event_type=PassportEvent.TYPE_RECIPE_TRIED,
                description=f'event-{i}', timestamp=base + timedelta(seconds=i),
            )
        response = self.client.get('/api/users/bob/passport/')
        timeline = response.data['timeline']
        self.assertEqual(len(timeline), 50)
        self.assertEqual(timeline[0]['description'], 'event-54')
        self.assertEqual(timeline[-1]['description'], 'event-5')


class PopulatedPassportEndpointTest(APITestCase):
    """GET /api/users/<username>/passport/ once stamps/quests/timeline exist."""

    def setUp(self):
        self.author = _make_user('author')
        self.bob = _make_user('bob')
        self.region = Region.objects.get_or_create(name='Caucasus')[0]
        self.recipes = [
            Recipe.objects.create(title=f'C{i}', description='d', author=self.author, region=self.region)
            for i in range(2)
        ]
        self.story = Story.objects.create(title='S', body='b', author=self.author, region=self.region)
        for r in self.recipes:
            services.record_recipe_try(self.bob, r)
        services.record_story_save(self.bob, self.story)

    def test_visitor_sees_populated_sections(self):
        response = self.client.get('/api/users/bob/passport/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data['stamps']) >= 1)
        self.assertTrue(len(response.data['timeline']) >= 1)
        self.assertEqual(len(response.data['culture_summaries']), 1)
        summary = response.data['culture_summaries'][0]
        self.assertEqual(summary['culture'], 'Caucasus')
        self.assertEqual(summary['recipes_tried'], 2)
        self.assertEqual(summary['stories_saved'], 1)

    def test_stats_reflect_activity(self):
        response = self.client.get('/api/users/bob/passport/')
        stats = response.data['stats']
        self.assertEqual(stats['recipes_tried'], 2)
        self.assertEqual(stats['stories_saved'], 1)
        self.assertEqual(stats['cultures_count'], 1)
        self.assertEqual(stats['heritage_shared'], 0)
        self.assertEqual(set(stats.keys()), EXPECTED_STATS_KEYS)

    def test_own_mode_matches_visitor_mode(self):
        anon = self.client.get('/api/users/bob/passport/').data
        _auth(self.client, 'bob')
        owned = self.client.get('/api/users/bob/passport/').data
        self.assertEqual(anon, owned)

    def test_unknown_username_still_404(self):
        response = self.client.get('/api/users/nobody/passport/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
