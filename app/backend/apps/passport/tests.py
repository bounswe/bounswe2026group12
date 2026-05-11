from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CulturalPassport
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
