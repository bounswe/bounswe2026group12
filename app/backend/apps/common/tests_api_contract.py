"""API contract verification suite (#535, Part A).

Walks every endpoint group named in #535 and asserts the *response contract*:
the HTTP status code, the response container shape (plain ``dict`` /
DRF-paginated ``{count, next, previous, results}`` / plain ``list``), and the
documented top-level fields with plausible types. It deliberately does not
assert exact values or row counts, so seed/data PRs landing in parallel cannot
break it. The field names asserted here are cross-checked against the web
(``app/frontend/src/services``) and mobile (``app/mobile/src/services``) client
service files so the suite encodes the contract those clients rely on.

Coverage map (issue #535 endpoint group -> test class):

  Auth ............... AuthContractTests
  Recipes ............ RecipeContractTests
  Stories ............ StoryContractTests
  Search ............. SearchContractTests
  Map ................ MapContractTests
  Messaging .......... MessagingContractTests
  Notifications ...... NotificationContractTests
  Cultural Content ... CulturalContentContractTests
  Heritage ........... HeritageContractTests
  Lookups ............ LookupContractTests

Part B of #535 (cross-platform E2E flows exercised on the web and mobile UI) is
performed manually by the team and is intentionally out of scope for this
automated suite.
"""
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cultural_content.models import CulturalContent, CulturalEvent
from apps.heritage.models import (
    CulturalFact, HeritageGroup, HeritageGroupMembership, HeritageJourneyStep,
)
from apps.notifications.models import Notification
from apps.recipes.models import (
    Comment, DietaryTag, EventTag, Ingredient, Recipe, RecipeIngredient,
    Region, Religion, Unit,
)
from apps.stories.models import Story, StoryRecipeLink

User = get_user_model()

PASSWORD = 'ContractPass123!'


class APIContractTestCase(APITestCase):
    """Shared deterministic fixtures for the contract suite.

    One logged-in author, one peer (for messaging), an approved region /
    ingredient / unit and the three taxonomy lookups, a published recipe with
    an ingredient row, a published story linked to that recipe, a heritage
    group with a journey step and a membership covering the recipe, a cultural
    fact, an active cultural-content card, a cultural event and a notification
    addressed to the author. Nothing here depends on a seed command.
    """

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email='contract_author@example.com',
            username='contract_author',
            password=PASSWORD,
        )
        cls.other_user = User.objects.create_user(
            email='contract_peer@example.com',
            username='contract_peer',
            password=PASSWORD,
        )
        cls.other_user.is_contactable = True
        cls.other_user.save(update_fields=['is_contactable'])

        cls.region = Region.objects.create(
            name='Anatolia', is_approved=True, latitude=39.0, longitude=35.0,
        )
        # Names chosen to not collide with the lookups seeded by migrations.
        cls.ingredient = Ingredient.objects.create(name='Contract Bulgur', is_approved=True)
        cls.unit = Unit.objects.create(name='contract-cup', is_approved=True)
        cls.dietary_tag = DietaryTag.objects.create(name='Contract Diet', is_approved=True)
        cls.event_tag = EventTag.objects.create(name='Contract Feast', is_approved=True)
        cls.religion = Religion.objects.create(name='Contract Faith', is_approved=True)

        cls.recipe = Recipe.objects.create(
            title='Kisir',
            description='A bulgur salad.',
            steps=['Soak the bulgur.', 'Mix in the rest.'],
            region=cls.region,
            author=cls.user,
            latitude='39.000000',
            longitude='35.000000',
            is_published=True,
        )
        RecipeIngredient.objects.create(
            recipe=cls.recipe, ingredient=cls.ingredient, amount='1.00', unit=cls.unit,
        )
        cls.comment = Comment.objects.create(
            recipe=cls.recipe, author=cls.user, body='Lovely.', type='COMMENT',
        )

        cls.story = Story.objects.create(
            title='Sunday lunches',
            body='A family memory tied to this dish.',
            author=cls.user,
            region=cls.region,
            is_published=True,
        )
        StoryRecipeLink.objects.create(story=cls.story, recipe=cls.recipe, order=0)

        cls.heritage_group = HeritageGroup.objects.create(
            name='Mediterranean Grain Cookery', description='Shared grain dishes.',
        )
        HeritageGroupMembership.objects.create(
            heritage_group=cls.heritage_group,
            content_type=ContentType.objects.get_for_model(Recipe),
            object_id=cls.recipe.id,
        )
        cls.journey_step = HeritageJourneyStep.objects.create(
            heritage_group=cls.heritage_group,
            order=1,
            location='Anatolia',
            story='Grain cookery spreads west.',
            era='Antiquity',
        )
        cls.cultural_fact = CulturalFact.objects.create(
            heritage_group=cls.heritage_group,
            region=cls.region,
            text='Bulgur predates rice in much of Anatolia.',
        )
        cls.cultural_card = CulturalContent.objects.create(
            slug='did-you-know-bulgur',
            kind=CulturalContent.Kind.values[0],
            title='Did you know?',
            body='Bulgur is parboiled and dried wheat.',
            region=cls.region,
            is_active=True,
        )
        cls.cultural_event = CulturalEvent.objects.create(
            name='Iftar', date_rule='lunar:ramadan', region=cls.region,
        )
        cls.notification = Notification.objects.create(
            recipient=cls.user,
            actor=cls.other_user,
            recipe=cls.recipe,
            message='contract_peer commented on your recipe.',
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def login(self, user=None):
        """Authenticate ``self.client`` via the real login endpoint and return
        the token pair, so token-dependent endpoints (refresh, logout) work."""
        target = user or self.user
        response = self.client.post(
            '/api/auth/login/', {'email': target.email, 'password': PASSWORD},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tokens = response.data
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        return tokens

    def assertPaginated(self, data):
        """Assert a DRF PageNumberPagination envelope."""
        self.assertIsInstance(data, dict)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, data)
        self.assertIsInstance(data['results'], list)
        return data['results']

    def assertHasKeys(self, obj, keys):
        self.assertIsInstance(obj, dict)
        for key in keys:
            self.assertIn(key, obj, f'expected key "{key}" in {sorted(obj)}')


class AuthContractTests(APIContractTestCase):
    """Auth: register, login, token refresh, logout, me, public profile."""

    def test_register_returns_tokens_and_user(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'fresh_user@example.com',
            'username': 'fresh_user',
            'password': PASSWORD,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertHasKeys(response.data, ['access', 'refresh', 'user'])
        self.assertIsInstance(response.data['access'], str)
        self.assertIsInstance(response.data['refresh'], str)
        self.assertHasKeys(response.data['user'], ['id', 'email', 'username', 'role'])

    def test_login_returns_tokens_and_user(self):
        response = self.client.post('/api/auth/login/', {
            'email': self.user.email, 'password': PASSWORD,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, ['access', 'refresh', 'user'])
        self.assertHasKeys(response.data['user'], ['id', 'email', 'username', 'role'])

    def test_token_refresh_returns_new_pair(self):
        tokens = self.login()
        # Drop the bearer header so the refresh POST is a clean unauthenticated
        # call, matching how the web/mobile clients use this endpoint.
        self.client.credentials()
        response = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, ['access', 'refresh'])

    def test_me_returns_user_profile(self):
        self.login()
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(
            response.data,
            ['id', 'email', 'username', 'role', 'created_at', 'is_contactable'],
        )

    def test_public_user_profile_shape(self):
        response = self.client.get(f'/api/users/{self.user.username}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(
            response.data, ['username', 'bio', 'region', 'recipe_count', 'story_count'],
        )
        self.assertNotIn('email', response.data)

    def test_logout_blacklists_refresh(self):
        tokens = self.login()
        response = self.client.post('/api/auth/logout/', {'refresh': tokens['refresh']})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)


class RecipeContractTests(APIContractTestCase):
    """Recipes: list, detail, create, edit (PATCH), publish, comments, votes."""

    DETAIL_FIELDS = [
        'id', 'public_id', 'title', 'description', 'steps',
        'region', 'region_name', 'latitude', 'longitude',
        'author', 'author_username', 'is_published',
        'created_at', 'updated_at', 'ingredients',
        'dietary_tags', 'event_tags', 'religions',
        'heritage_group', 'endangered_notes', 'story_count',
    ]

    def test_recipe_list_is_paginated_with_documented_rows(self):
        response = self.client.get('/api/recipes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.assertPaginated(response.data)
        self.assertGreaterEqual(len(results), 1)
        self.assertHasKeys(results[0], self.DETAIL_FIELDS)

    def test_recipe_detail_shape(self):
        response = self.client.get(f'/api/recipes/{self.recipe.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, self.DETAIL_FIELDS)
        self.assertIsInstance(response.data['public_id'], str)
        self.assertIsInstance(response.data['ingredients'], list)
        # The recipe is in a heritage group, so the nested {id, name} shape
        # the clients render should be populated rather than null.
        self.assertHasKeys(response.data['heritage_group'], ['id', 'name'])

    def test_recipe_create_edit_publish_round_trip(self):
        self.login()
        create = self.client.post('/api/recipes/', {
            'title': 'Mercimek Corbasi',
            'description': 'Red lentil soup.',
            'region': self.region.id,
            'ingredients_write': [{'ingredient': self.ingredient.id, 'amount': '2.00'}],
        }, format='json')
        self.assertEqual(create.status_code, status.HTTP_201_CREATED, create.data)
        self.assertHasKeys(create.data, self.DETAIL_FIELDS)
        recipe_id = create.data['id']
        self.assertFalse(create.data['is_published'])

        patch = self.client.patch(
            f'/api/recipes/{recipe_id}/', {'title': 'Mercimek'}, format='json',
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data['title'], 'Mercimek')

        publish = self.client.post(f'/api/recipes/{recipe_id}/publish/')
        self.assertEqual(publish.status_code, status.HTTP_200_OK)
        self.assertTrue(publish.data['is_published'])

    def test_recipe_comments_list_and_create(self):
        list_response = self.client.get(f'/api/recipes/{self.recipe.pk}/comments/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        results = self.assertPaginated(list_response.data)
        self.assertHasKeys(
            results[0],
            ['id', 'recipe', 'author', 'author_username', 'body', 'type',
             'created_at', 'helpful_count', 'has_voted'],
        )

        self.login()
        create = self.client.post(
            f'/api/recipes/{self.recipe.pk}/comments/',
            {'body': 'Tried it, great.', 'type': 'COMMENT'}, format='json',
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED, create.data)
        self.assertHasKeys(
            create.data, ['id', 'body', 'author_username', 'helpful_count', 'has_voted'],
        )

    def test_comment_vote_toggle_shape(self):
        self.login()
        first = self.client.post(f'/api/comments/{self.comment.pk}/vote/')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data, {'status': 'voted'})
        second = self.client.post(f'/api/comments/{self.comment.pk}/vote/')
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data, {'status': 'unvoted'})


class StoryContractTests(APIContractTestCase):
    """Stories: list, detail, create, edit (PATCH), publish."""

    DETAIL_FIELDS = [
        'id', 'public_id', 'title', 'summary', 'body', 'author', 'author_username',
        'linked_recipe', 'recipe_title', 'linked_recipes',
        'dietary_tags', 'event_tags', 'religions',
        'language', 'region', 'region_name', 'story_type',
        'is_published', 'created_at', 'updated_at', 'heritage_group',
    ]

    def test_story_list_is_paginated_with_documented_rows(self):
        response = self.client.get('/api/stories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.assertPaginated(response.data)
        self.assertGreaterEqual(len(results), 1)
        self.assertHasKeys(results[0], self.DETAIL_FIELDS)
        self.assertIsInstance(results[0]['linked_recipes'], list)

    def test_story_detail_shape(self):
        response = self.client.get(f'/api/stories/{self.story.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, self.DETAIL_FIELDS)

    def test_story_create_edit_publish_round_trip(self):
        self.login()
        create = self.client.post('/api/stories/', {
            'title': 'Grandmother\'s table',
            'body': 'How the recipe travelled.',
            'region': self.region.id,
            'linked_recipe_ids': [self.recipe.id],
        }, format='json')
        self.assertEqual(create.status_code, status.HTTP_201_CREATED, create.data)
        self.assertHasKeys(create.data, self.DETAIL_FIELDS)
        story_id = create.data['id']
        self.assertFalse(create.data['is_published'])

        patch = self.client.patch(
            f'/api/stories/{story_id}/', {'summary': 'Updated summary.'}, format='json',
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data['summary'], 'Updated summary.')

        publish = self.client.post(f'/api/stories/{story_id}/publish/')
        self.assertEqual(publish.status_code, status.HTTP_200_OK)
        self.assertTrue(publish.data['is_published'])


class SearchContractTests(APIContractTestCase):
    """Search: global search, recommendations (explore surface), cultural events."""

    def test_global_search_envelope(self):
        response = self.client.get('/api/search/', {'q': 'Kisir'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(
            response.data, ['recipes', 'stories', 'results', 'total_count', 'parsed'],
        )
        self.assertIsInstance(response.data['recipes'], list)
        self.assertIsInstance(response.data['stories'], list)
        self.assertIsInstance(response.data['results'], list)
        self.assertHasKeys(response.data['parsed'], ['region', 'event', 'diets', 'religions'])

    def test_recommendations_explore_surface(self):
        response = self.client.get('/api/recommendations/', {'surface': 'explore'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, ['surface', 'results', 'total_count'])
        self.assertEqual(response.data['surface'], 'explore')
        self.assertIsInstance(response.data['results'], list)

    def test_cultural_events_list_shape(self):
        response = self.client.get('/api/cultural-events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(
            response.data[0], ['id', 'name', 'date_rule', 'region', 'description', 'recipes'],
        )
        self.assertIsInstance(response.data[0]['recipes'], list)


class MapContractTests(APIContractTestCase):
    """Map: region index, region detail, region content, bounding-box discover."""

    def test_region_index_shape(self):
        response = self.client.get('/api/map/regions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # The seeded region has coordinates, so it survives the default
        # geo_only filter regardless of what the geo-seed PR adds later.
        self.assertGreaterEqual(len(response.data), 1)
        row = response.data[0]
        self.assertHasKeys(
            row, ['id', 'name', 'latitude', 'longitude', 'has_geo', 'content_count'],
        )
        self.assertHasKeys(row['content_count'], ['recipes', 'stories', 'cultural_content'])

    def test_region_detail_shape(self):
        response = self.client.get(f'/api/map/regions/{self.region.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(
            response.data,
            ['id', 'name', 'latitude', 'longitude', 'has_geo', 'content_count'],
        )

    def test_region_content_is_paginated(self):
        response = self.client.get(f'/api/map/regions/{self.region.pk}/content/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.assertPaginated(response.data)
        # Our published recipe + story are tagged to this region.
        self.assertGreaterEqual(len(results), 1)
        self.assertIn('content_type', results[0])

    def test_bounding_box_discover_shape(self):
        response = self.client.get('/api/map/discover/', {
            'north': '90', 'south': '-90', 'east': '180', 'west': '-180',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, ['viewport', 'regions', 'total_content'])
        self.assertHasKeys(response.data['viewport'], ['north', 'south', 'east', 'west'])
        self.assertIsInstance(response.data['regions'], list)


class MessagingContractTests(APIContractTestCase):
    """Messaging: thread list, create thread, send message, list messages, read."""

    def test_thread_list_requires_auth_and_returns_list(self):
        anon = self.client.get('/api/threads/')
        self.assertEqual(anon.status_code, status.HTTP_401_UNAUTHORIZED)

        self.login()
        response = self.client.get('/api/threads/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_thread_lifecycle_contract(self):
        self.login()
        create = self.client.post(
            '/api/threads/', {'other_user_id': self.other_user.id}, format='json',
        )
        self.assertIn(create.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        self.assertHasKeys(
            create.data,
            ['id', 'other_user_id', 'other_username', 'last_message_at',
             'last_message_preview', 'unread_count', 'created_at'],
        )
        thread_id = create.data['id']

        send = self.client.post(
            f'/api/threads/{thread_id}/send/', {'body': 'Merhaba'}, format='json',
        )
        self.assertEqual(send.status_code, status.HTTP_201_CREATED)
        self.assertHasKeys(
            send.data,
            ['id', 'thread', 'sender', 'sender_username', 'body', 'created_at', 'is_deleted'],
        )

        messages = self.client.get(f'/api/threads/{thread_id}/messages/')
        self.assertEqual(messages.status_code, status.HTTP_200_OK)
        self.assertIsInstance(messages.data, list)
        self.assertGreaterEqual(len(messages.data), 1)

        read = self.client.post(f'/api/threads/{thread_id}/read/')
        self.assertEqual(read.status_code, status.HTTP_200_OK)
        self.assertEqual(read.data, {'status': 'read'})


class NotificationContractTests(APIContractTestCase):
    """Notifications: list, mark one read, mark all read."""

    def test_notification_list_shape(self):
        self.login()
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(
            response.data[0],
            ['id', 'actor', 'actor_username', 'recipe', 'recipe_title',
             'message', 'is_read', 'created_at'],
        )

    def test_mark_notification_read(self):
        self.login()
        response = self.client.post(f'/api/notifications/{self.notification.pk}/read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_read'])

    def test_mark_all_notifications_read(self):
        self.login()
        response = self.client.post('/api/notifications/read-all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('marked_read', response.data)


class CulturalContentContractTests(APIContractTestCase):
    """Cultural content: daily cards, cultural facts (+ random), cultural events."""

    def test_daily_cultural_content_cards(self):
        response = self.client.get('/api/cultural-content/daily/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(response.data[0], ['id', 'kind', 'title', 'body'])

    def test_cultural_facts_list_shape(self):
        response = self.client.get('/api/cultural-facts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        fact = response.data[0]
        self.assertHasKeys(fact, ['id', 'heritage_group', 'region', 'text', 'source_url', 'created_at'])
        # heritage_group and region are nested {id, name} on read (or null).
        self.assertHasKeys(fact['heritage_group'], ['id', 'name'])
        self.assertHasKeys(fact['region'], ['id', 'name'])

    def test_cultural_fact_random_shape(self):
        response = self.client.get('/api/cultural-facts/random/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, ['id', 'text', 'heritage_group', 'region', 'created_at'])

    def test_cultural_events_list_shape(self):
        response = self.client.get('/api/cultural-events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertHasKeys(response.data[0], ['id', 'name', 'date_rule', 'region', 'recipes'])


class HeritageContractTests(APIContractTestCase):
    """Heritage: group list/detail, journey steps."""

    def test_heritage_group_list_shape(self):
        response = self.client.get('/api/heritage-groups/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(response.data[0], ['id', 'name', 'member_count'])

    def test_heritage_group_detail_shape(self):
        response = self.client.get(f'/api/heritage-groups/{self.heritage_group.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertHasKeys(response.data, ['id', 'name', 'description', 'members', 'journey_steps'])
        self.assertIsInstance(response.data['members'], list)
        self.assertIsInstance(response.data['journey_steps'], list)

    def test_heritage_journey_steps_list_shape(self):
        response = self.client.get('/api/heritage-journey-steps/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(
            response.data[0],
            ['id', 'heritage_group', 'order', 'location', 'story', 'era', 'created_at', 'updated_at'],
        )


class LookupContractTests(APIContractTestCase):
    """Lookups: regions, ingredients, units, dietary-tags, event-tags, religions."""

    def test_regions_lookup_shape(self):
        response = self.client.get('/api/regions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(
            response.data[0], ['id', 'name', 'is_approved', 'latitude', 'longitude'],
        )

    def test_ingredients_lookup_shape(self):
        response = self.client.get('/api/ingredients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(response.data[0], ['id', 'name', 'heritage_status'])

    def test_units_lookup_shape(self):
        response = self.client.get('/api/units/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(response.data[0], ['id', 'name'])

    def test_dietary_tags_lookup_shape(self):
        response = self.client.get('/api/dietary-tags/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(response.data[0], ['id', 'name'])

    def test_event_tags_lookup_shape(self):
        response = self.client.get('/api/event-tags/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(response.data[0], ['id', 'name'])

    def test_religions_lookup_shape(self):
        response = self.client.get('/api/religions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertHasKeys(response.data[0], ['id', 'name'])
