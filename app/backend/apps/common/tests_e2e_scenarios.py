"""End-to-end flow scenarios (#397, #QA-01 backend slice).

Multi-step, server-side flows that walk several endpoints in sequence the way
a real user would, asserting that state carries correctly from one step to the
next. This is the layer above the per-endpoint contract suite (#535,
``apps/common/tests_api_contract.py``): #535 pins each endpoint's response
shape, this module pins the cross-endpoint behaviour (a notification raised by
one call is visible to the other party on a later call, an inbox reflects a
message sent earlier, a profile reflects an onboarding PATCH, and so on).

Covered happy paths (M4 to M6):

  Onboarding ............... OnboardingFlowTests
  Q&A ...................... QuestionAndAnswerFlowTests
  Messaging ................ MessagingFlowTests
  Ingredient substitution .. IngredientSubstitutionFlowTests
  Unit conversion .......... UnitConversionFlowTests
  Map discovery ............ MapDiscoveryFlowTests

Scope is happy paths plus a couple of obvious negative assertions, per the
issue. The client-side UI E2E (Cypress / Playwright / Detox) is the paired
frontend/mobile effort and is intentionally out of scope here.

Runs in CI via the existing ``manage.py test`` workflow; no CI change needed
(the module lives under ``apps/`` so it is auto-discovered, and the coverage
step already omits ``*/tests*``).
"""
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Ingredient, IngredientSubstitution, Region

User = get_user_model()

PASSWORD = 'E2EFlowPass123!'


class FlowTestCase(APITestCase):
    """Shared helpers: register / login / logout against the real auth API."""

    def register(self, username, **extra):
        """Register a user through ``POST /api/auth/register/`` and return the
        response payload (which includes ``user``, ``access``, ``refresh``)."""
        payload = {
            'username': username,
            'email': f'{username}@example.com',
            'password': PASSWORD,
        }
        payload.update(extra)
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def login(self, email):
        """Authenticate ``self.client`` via ``POST /api/auth/login/`` and set
        the bearer header. Returns the login payload."""
        response = self.client.post(
            '/api/auth/login/', {'email': email, 'password': PASSWORD}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return response.data

    def logout_client(self):
        """Drop the bearer header so the next request is anonymous."""
        self.client.credentials()

    # -- assertion helpers -------------------------------------------------

    def assertPaginated(self, data):
        self.assertIsInstance(data, dict)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, data)
        self.assertIsInstance(data['results'], list)
        return data['results']


class OnboardingFlowTests(FlowTestCase):
    """Register -> login -> me -> profile (onboarding) PATCH -> me reflects it.

    There is no dedicated server-side "onboarding" endpoint: the cultural
    onboarding the web/mobile clients drive (region, cultural interests,
    regional ties, contactability) is persisted through ``PATCH
    /api/users/me/`` (#659). This flow walks that path end to end and confirms
    both the authenticated ``me`` view and the public profile view reflect the
    onboarding choices afterwards.
    """

    def test_register_login_complete_onboarding(self):
        # 1. Register.
        registered = self.register('e2e_onboard')
        self.assertIn('access', registered)
        self.assertIn('refresh', registered)
        self.assertEqual(registered['user']['username'], 'e2e_onboard')
        # Fresh accounts start with no onboarding data.
        self.assertEqual(registered['user'].get('region', ''), '')
        self.assertEqual(registered['user'].get('cultural_interests', []), [])

        # 2. Log in (separate call, like the clients do after registration).
        self.login('e2e_onboard@example.com')

        # 3. me reflects the empty starting state.
        me = self.client.get('/api/users/me/')
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data['username'], 'e2e_onboard')
        self.assertEqual(me.data['region'], '')
        self.assertEqual(me.data['cultural_interests'], [])

        # 4. Complete onboarding via the self-service profile PATCH.
        patch = self.client.patch('/api/users/me/', {
            'region': 'Anatolia',
            'cultural_interests': ['Mediterranean grain cookery', 'Fermentation'],
            'regional_ties': ['Aegean'],
            'is_contactable': True,
            'bio': 'Home cook tracing family recipes.',
        }, format='json')
        self.assertEqual(patch.status_code, status.HTTP_200_OK, patch.data)
        self.assertEqual(patch.data['region'], 'Anatolia')
        self.assertEqual(
            patch.data['cultural_interests'],
            ['Mediterranean grain cookery', 'Fermentation'],
        )
        self.assertEqual(patch.data['regional_ties'], ['Aegean'])

        # 5. A fresh me read still carries the onboarding choices.
        me_after = self.client.get('/api/users/me/')
        self.assertEqual(me_after.status_code, status.HTTP_200_OK)
        self.assertEqual(me_after.data['region'], 'Anatolia')
        self.assertEqual(me_after.data['bio'], 'Home cook tracing family recipes.')
        self.assertIn('Fermentation', me_after.data['cultural_interests'])

        # 6. The public profile (anonymous) exposes the onboarding-derived
        #    fields too, without leaking the email.
        self.logout_client()
        public = self.client.get('/api/users/e2e_onboard/')
        self.assertEqual(public.status_code, status.HTTP_200_OK)
        self.assertEqual(public.data['region'], 'Anatolia')
        self.assertIn('Fermentation', public.data['cultural_interests'])
        self.assertNotIn('email', public.data)


class QuestionAndAnswerFlowTests(FlowTestCase):
    """Recipe Q&A: question -> author notification -> reply -> asker
    notification -> comments endpoint shows the thread.

    Steps:
      1. Author publishes a recipe.
      2. A second user posts a QUESTION comment on it.
      3. The author receives an in-app notification about the question.
      4. The author replies to the question.
      5. The asker receives an in-app notification about the reply.
      6. The recipe's comments endpoint returns both the question and the
         reply, with the reply linked to the question via ``parent_comment``.
      7. The author marks the question notification read; a later read shows
         it flagged.
    """

    @classmethod
    def setUpTestData(cls):
        # Reference data the recipe-create endpoint needs (one approved
        # ingredient). Not part of the flow under test, so created directly.
        cls.ingredient = Ingredient.objects.create(name='E2E Bulgur', is_approved=True)

    def test_question_notifies_author_and_reply_notifies_asker(self):
        self.register('e2e_qa_author')
        self.register('e2e_qa_asker')

        # 1. Author logs in and publishes a recipe.
        self.login('e2e_qa_author@example.com')
        create = self.client.post('/api/recipes/', {
            'title': 'Kisir',
            'description': 'A bulgur salad worth asking about.',
            'ingredients_write': [{'ingredient': self.ingredient.id, 'amount': '1.00'}],
        }, format='json')
        self.assertEqual(create.status_code, status.HTTP_201_CREATED, create.data)
        recipe_id = create.data['id']
        self.assertFalse(create.data['is_published'])
        publish = self.client.post(f'/api/recipes/{recipe_id}/publish/')
        self.assertEqual(publish.status_code, status.HTTP_200_OK)
        self.assertTrue(publish.data['is_published'])

        # 2. The asker posts a QUESTION comment.
        self.login('e2e_qa_asker@example.com')
        question = self.client.post(
            f'/api/recipes/{recipe_id}/comments/',
            {'body': 'How long should the bulgur soak?', 'type': 'QUESTION'},
            format='json',
        )
        self.assertEqual(question.status_code, status.HTTP_201_CREATED, question.data)
        question_id = question.data['id']
        self.assertEqual(question.data['type'], 'QUESTION')

        # 3. The author now has a notification about the question.
        self.login('e2e_qa_author@example.com')
        author_notifs = self.client.get('/api/notifications/')
        self.assertEqual(author_notifs.status_code, status.HTTP_200_OK)
        self.assertIsInstance(author_notifs.data, list)
        self.assertGreaterEqual(len(author_notifs.data), 1)
        question_notif = author_notifs.data[0]
        self.assertIn('e2e_qa_asker', question_notif['message'])
        self.assertIn('Kisir', question_notif['message'])
        self.assertFalse(question_notif['is_read'])

        # 4. The author replies to the question.
        reply = self.client.post(
            f'/api/recipes/{recipe_id}/comments/',
            {'body': 'About thirty minutes in warm water.', 'type': 'COMMENT',
             'parent_comment': question_id},
            format='json',
        )
        self.assertEqual(reply.status_code, status.HTTP_201_CREATED, reply.data)
        self.assertEqual(reply.data['parent_comment'], question_id)

        # 5. The asker now has a notification about the reply.
        self.login('e2e_qa_asker@example.com')
        asker_notifs = self.client.get('/api/notifications/')
        self.assertEqual(asker_notifs.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(asker_notifs.data), 1)
        self.assertIn('e2e_qa_author', asker_notifs.data[0]['message'])

        # 6. The comments endpoint shows the whole thread (anonymous read).
        self.logout_client()
        comments = self.client.get(f'/api/recipes/{recipe_id}/comments/')
        self.assertEqual(comments.status_code, status.HTTP_200_OK)
        rows = self.assertPaginated(comments.data)
        self.assertGreaterEqual(len(rows), 2)
        by_id = {row['id']: row for row in rows}
        self.assertIn(question_id, by_id)
        self.assertEqual(by_id[question_id]['type'], 'QUESTION')
        reply_rows = [r for r in rows if r['parent_comment'] == question_id]
        self.assertEqual(len(reply_rows), 1)

        # 7. The author marks the question notification read; it stays read.
        self.login('e2e_qa_author@example.com')
        mark = self.client.post(f'/api/notifications/{question_notif["id"]}/read/')
        self.assertEqual(mark.status_code, status.HTTP_200_OK)
        self.assertTrue(mark.data['is_read'])
        refreshed = self.client.get('/api/notifications/')
        refreshed_notif = next(n for n in refreshed.data if n['id'] == question_notif['id'])
        self.assertTrue(refreshed_notif['is_read'])


class MessagingFlowTests(FlowTestCase):
    """Direct messaging: start thread -> send -> other side sees it in their
    inbox with an unread count -> they read it -> they reply -> the first user
    sees the reply with an unread count -> they read it.

    Asserts the unread/read cursor behaves across both participants.
    """

    def test_thread_message_inbox_reply_read_state(self):
        self.register('e2e_msg_a')
        b_payload = self.register('e2e_msg_b')
        b_id = b_payload['user']['id']

        # 1. A starts a thread with B.
        self.login('e2e_msg_a@example.com')
        create = self.client.post('/api/threads/', {'other_user_id': b_id}, format='json')
        self.assertIn(create.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        thread_id = create.data['id']
        self.assertEqual(create.data['other_user_id'], b_id)
        self.assertEqual(create.data['unread_count'], 0)

        # 2. A sends a message.
        send = self.client.post(
            f'/api/threads/{thread_id}/send/', {'body': 'Merhaba, can I ask about your recipe?'},
            format='json',
        )
        self.assertEqual(send.status_code, status.HTTP_201_CREATED, send.data)
        self.assertEqual(send.data['sender_username'], 'e2e_msg_a')

        # 3. A's own inbox: thread present, nothing unread (sender auto-read).
        a_inbox = self.client.get('/api/threads/')
        self.assertEqual(a_inbox.status_code, status.HTTP_200_OK)
        a_thread = next(t for t in a_inbox.data if t['id'] == thread_id)
        self.assertEqual(a_thread['unread_count'], 0)
        self.assertIn('Merhaba', a_thread['last_message_preview'])

        # 4. B's inbox: thread present with one unread message from A.
        self.login('e2e_msg_b@example.com')
        b_inbox = self.client.get('/api/threads/')
        self.assertEqual(b_inbox.status_code, status.HTTP_200_OK)
        b_thread = next(t for t in b_inbox.data if t['id'] == thread_id)
        self.assertEqual(b_thread['unread_count'], 1)
        self.assertEqual(b_thread['other_username'], 'e2e_msg_a')

        # 5. B opens the thread and sees A's message body.
        messages = self.client.get(f'/api/threads/{thread_id}/messages/')
        self.assertEqual(messages.status_code, status.HTTP_200_OK)
        self.assertIsInstance(messages.data, list)
        self.assertEqual(len(messages.data), 1)
        self.assertIn('Merhaba', messages.data[0]['body'])

        # 6. B marks the thread read; the unread count clears for B.
        read = self.client.post(f'/api/threads/{thread_id}/read/')
        self.assertEqual(read.status_code, status.HTTP_200_OK)
        self.assertEqual(read.data, {'status': 'read'})
        b_inbox_after = self.client.get('/api/threads/')
        b_thread_after = next(t for t in b_inbox_after.data if t['id'] == thread_id)
        self.assertEqual(b_thread_after['unread_count'], 0)

        # 7. B replies.
        b_send = self.client.post(
            f'/api/threads/{thread_id}/send/', {'body': 'Sure, what would you like to know?'},
            format='json',
        )
        self.assertEqual(b_send.status_code, status.HTTP_201_CREATED)
        self.assertEqual(b_send.data['sender_username'], 'e2e_msg_b')

        # 8. A now has one unread message and can read both messages in order.
        self.login('e2e_msg_a@example.com')
        a_inbox_2 = self.client.get('/api/threads/')
        a_thread_2 = next(t for t in a_inbox_2.data if t['id'] == thread_id)
        self.assertEqual(a_thread_2['unread_count'], 1)
        a_messages = self.client.get(f'/api/threads/{thread_id}/messages/')
        self.assertEqual(len(a_messages.data), 2)
        senders = [m['sender_username'] for m in a_messages.data]
        self.assertEqual(senders, ['e2e_msg_a', 'e2e_msg_b'])

        # 9. A reads the thread; unread clears for A too.
        self.client.post(f'/api/threads/{thread_id}/read/')
        a_inbox_3 = self.client.get('/api/threads/')
        a_thread_3 = next(t for t in a_inbox_3.data if t['id'] == thread_id)
        self.assertEqual(a_thread_3['unread_count'], 0)


class IngredientSubstitutionFlowTests(FlowTestCase):
    """Browse ingredients -> pick one -> get its ranked substitutes.

    Uses the canonical seed so the substitution graph is populated, then walks
    the public flow a client follows: list ingredients, find one that has
    substitutes, fetch its categorized substitution suggestions, and confirm
    the suggested ingredient and its ranking come back in the documented shape.
    """

    @classmethod
    def setUpTestData(cls):
        call_command('seed_canonical', stdout=StringIO(), stderr=StringIO())
        # Pick any seeded edge between two approved ingredients to drive the
        # flow, rather than hard-coding a specific pair.
        edge = (
            IngredientSubstitution.objects
            .select_related('from_ingredient', 'to_ingredient')
            .filter(from_ingredient__is_approved=True, to_ingredient__is_approved=True)
            .first()
        )
        assert edge is not None, 'seed_canonical should populate the substitution graph'
        cls.source = edge.from_ingredient
        cls.target = edge.to_ingredient

    def test_browse_then_fetch_substitutes(self):
        # 1. The ingredient lookup lists our source ingredient.
        listing = self.client.get('/api/ingredients/')
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertIsInstance(listing.data, list)
        listed_ids = {row['id'] for row in listing.data}
        self.assertIn(self.source.id, listed_ids)

        # 2. Fetch categorized substitutes for that ingredient (anonymous).
        subs = self.client.get(f'/api/ingredients/{self.source.id}/substitutes/')
        self.assertEqual(subs.status_code, status.HTTP_200_OK)
        self.assertEqual(subs.data['ingredient'], {'id': self.source.id, 'name': self.source.name})

        # 3. The match-type buckets exist and at least one carries a suggestion
        #    whose row has the documented shape (id, name, closeness, notes).
        match_type_keys = list(IngredientSubstitution.MatchType.values)
        for key in match_type_keys:
            self.assertIn(key, subs.data)
            self.assertIsInstance(subs.data[key], list)
        all_rows = [row for key in match_type_keys for row in subs.data[key]]
        self.assertGreaterEqual(len(all_rows), 1)
        for row in all_rows:
            for field in ('id', 'name', 'closeness', 'notes'):
                self.assertIn(field, row)
            self.assertTrue(Decimal('0') <= Decimal(str(row['closeness'])) <= Decimal('1'))
        # The seeded target ingredient is among the suggestions.
        self.assertIn(self.target.id, {row['id'] for row in all_rows})

        # 4. Negative: an unknown ingredient id is a clean 404.
        missing = self.client.get('/api/ingredients/99999999/substitutes/')
        self.assertEqual(missing.status_code, status.HTTP_404_NOT_FOUND)


class UnitConversionFlowTests(FlowTestCase):
    """Convert a quantity, then convert the result back, and confirm it round
    trips; confirm an incompatible conversion is a clean 4xx.

    The conversion endpoint is public (no auth), matching how the recipe-view
    "convert this amount" control calls it.
    """

    def _convert(self, amount, from_unit, to_unit, **extra):
        payload = {'amount': str(amount), 'from_unit': from_unit, 'to_unit': to_unit}
        payload.update(extra)
        return self.client.post('/api/convert/', payload, format='json')

    def test_round_trip_and_incompatible(self):
        # 1. Convert within the volume dimension: 2 cups -> millilitres.
        forward = self._convert('2', 'cup', 'ml')
        self.assertEqual(forward.status_code, status.HTTP_200_OK, forward.data)
        self.assertEqual(Decimal(forward.data['amount']), Decimal('480'))
        self.assertEqual(forward.data['from_unit'], 'cup')
        self.assertEqual(forward.data['to_unit'], 'ml')

        # 2. Convert the result back: 480 ml -> cups gives 2 again.
        back = self._convert(forward.data['amount'], 'ml', 'cup')
        self.assertEqual(back.status_code, status.HTTP_200_OK, back.data)
        self.assertEqual(Decimal(back.data['amount']), Decimal('2'))

        # 3. A second pair within the mass dimension: 1000 g -> 1 kg.
        mass = self._convert('1000', 'g', 'kg')
        self.assertEqual(mass.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(mass.data['amount']), Decimal('1'))

        # 4. Negative: mass <-> volume without a density is rejected cleanly.
        incompatible = self._convert('100', 'g', 'cup')
        self.assertEqual(incompatible.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', incompatible.data)

        # 5. Negative: an unknown unit is rejected cleanly.
        unknown = self._convert('1', 'cup', 'parsec')
        self.assertEqual(unknown.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', unknown.data)


class MapDiscoveryFlowTests(FlowTestCase):
    """Map discovery: pan the viewport -> see geo-enriched regions -> open a
    region -> see its recipes/stories.

    Uses the canonical seed plus the region geo seed so regions have
    coordinates, then walks the public map flow and confirms the ``geo_only``
    default (the region index only returns regions that have coordinates).
    """

    @classmethod
    def setUpTestData(cls):
        call_command('seed_canonical', stdout=StringIO(), stderr=StringIO())
        call_command('seed_region_geo', stdout=StringIO(), stderr=StringIO())
        # A region that is both geo-enriched and carries at least one published
        # recipe, so the region-content step has something to return.
        cls.region = (
            Region.objects
            .filter(latitude__isnull=False, longitude__isnull=False, recipes__is_published=True)
            .distinct()
            .first()
        )
        assert cls.region is not None, 'expected a geo-enriched region with published recipes'

    def test_discover_then_open_region(self):
        # 1. Wide-viewport discover returns regions with content counts.
        discover = self.client.get('/api/map/discover/', {
            'north': '90', 'south': '-90', 'east': '180', 'west': '-180',
        })
        self.assertEqual(discover.status_code, status.HTTP_200_OK)
        for key in ('viewport', 'regions', 'total_content'):
            self.assertIn(key, discover.data)
        self.assertIsInstance(discover.data['regions'], list)
        self.assertGreaterEqual(len(discover.data['regions']), 1)

        # 2. The region index (geo_only default) lists only regions that have
        #    coordinates, and includes our seeded region.
        index = self.client.get('/api/map/regions/')
        self.assertEqual(index.status_code, status.HTTP_200_OK)
        self.assertIsInstance(index.data, list)
        self.assertGreaterEqual(len(index.data), 1)
        for row in index.data:
            self.assertIsNotNone(row['latitude'])
            self.assertIsNotNone(row['longitude'])
            self.assertIn('content_count', row)
        self.assertIn(self.region.id, {row['id'] for row in index.data})

        # 3. geo_only=false returns at least as many regions as the default.
        all_regions = self.client.get('/api/map/regions/', {'geo_only': 'false'})
        self.assertEqual(all_regions.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(all_regions.data), len(index.data))

        # 4. Open the region: detail carries coords and a non-zero recipe count.
        detail = self.client.get(f'/api/map/regions/{self.region.id}/')
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['id'], self.region.id)
        self.assertIsNotNone(detail.data['latitude'])
        self.assertGreaterEqual(detail.data['content_count']['recipes'], 1)

        # 5. The region's content lists its recipes.
        content = self.client.get(f'/api/map/regions/{self.region.id}/content/')
        self.assertEqual(content.status_code, status.HTTP_200_OK)
        rows = self.assertPaginated(content.data)
        self.assertGreaterEqual(len(rows), 1)
        self.assertTrue(any(row.get('content_type') == 'recipe' for row in rows))
