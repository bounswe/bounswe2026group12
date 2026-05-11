from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class UserModelTest(TestCase):
    """Basic tests for the custom User model (Issue #149)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='StrongPass123!',
        )

    def test_user_created_with_email(self):
        self.assertEqual(self.user.email, 'test@example.com')

    def test_user_created_with_username(self):
        self.assertEqual(self.user.username, 'testuser')

    def test_default_role_is_user(self):
        self.assertEqual(self.user.role, User.Role.USER)

    def test_password_is_hashed(self):
        self.assertNotEqual(self.user.password, 'StrongPass123!')
        self.assertTrue(self.user.check_password('StrongPass123!'))

    def test_str_representation(self):
        self.assertEqual(str(self.user), 'testuser <test@example.com>')

    def test_email_is_login_field(self):
        self.assertEqual(User.USERNAME_FIELD, 'email')

    def test_superuser_has_admin_role(self):
        admin = User.objects.create_superuser(
            email='admin@example.com',
            username='admin',
            password='AdminPass123!',
        )
        self.assertEqual(admin.role, User.Role.ADMIN)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)


class RegisterTest(APITestCase):
    """Tests for POST /api/auth/register/ (#174)."""

    def test_register_success(self):
        data = {"email": "new@example.com", "username": "newuser", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'new@example.com')

    def test_register_missing_email(self):
        data = {"username": "nouser", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_register_missing_username(self):
        data = {"email": "no@example.com", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_register_missing_password(self):
        data = {"email": "no@example.com", "username": "nopass"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_register_short_password(self):
        data = {"email": "short@example.com", "username": "shortpw", "password": "abc"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_register_duplicate_email(self):
        User.objects.create_user(email='dup@example.com', username='dup1', password='StrongPass123!')
        data = {"email": "dup@example.com", "username": "dup2", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username(self):
        User.objects.create_user(email='one@example.com', username='taken', password='StrongPass123!')
        data = {"email": "two@example.com", "username": "taken", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_invalid_email(self):
        data = {"email": "notanemail", "username": "badmail", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTest(APITestCase):
    """Tests for POST /api/auth/login/ (#174)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='login@example.com', username='loginuser', password='StrongPass123!'
        )

    def test_login_success(self):
        """TC_API_AUTH_001 - Login returns valid JWT.

        Designer: Ahmet Akdag. Lab 9 acceptance test.
        Requirements: 3.0.2, 3.1.1.

        Asserts HTTP 200, that the response contains both access and refresh
        tokens, and that the access token decodes against the configured
        signing key with a user_id claim matching the registered user and an
        exp claim within the configured ACCESS_TOKEN_LIFETIME.
        """
        import time
        import jwt
        from django.conf import settings

        data = {"email": "login@example.com", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

        access = response.data['access']
        decoded = jwt.decode(access, settings.SECRET_KEY, algorithms=['HS256'])
        # SimpleJWT stringifies the user_id claim; compare as string.
        self.assertEqual(str(decoded['user_id']), str(self.user.id))

        now = int(time.time())
        self.assertGreater(decoded['exp'], now)
        lifetime_seconds = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
        self.assertLessEqual(decoded['exp'] - now, lifetime_seconds + 5)

    def test_access_token_lifetime_configuration(self):
        from django.conf import settings
        self.assertEqual(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(), 3600)

    def test_refresh_token_lifetime_configuration(self):
        from django.conf import settings
        self.assertEqual(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(), 90 * 24 * 3600)

    def test_refresh_token_payload_lifetime(self):
        import time
        import jwt
        from django.conf import settings

        data = {"email": "login@example.com", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/login/', data)
        refresh = response.data['refresh']
        decoded = jwt.decode(refresh, settings.SECRET_KEY, algorithms=['HS256'])

        now = int(time.time())
        lifetime_seconds = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
        self.assertLessEqual(decoded['exp'] - now, lifetime_seconds + 5)
        self.assertGreaterEqual(decoded['exp'] - now, lifetime_seconds - 5)

    def test_login_wrong_password(self):
        data = {"email": "login@example.com", "password": "WrongPass999!"}
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_email(self):
        data = {"email": "ghost@example.com", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_email(self):
        data = {"password": "StrongPass123!"}
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_password(self):
        data = {"email": "login@example.com"}
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutTest(APITestCase):
    """Tests for POST /api/auth/logout/ (#174)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='logout@example.com', username='logoutuser', password='StrongPass123!'
        )
        response = self.client.post('/api/auth/login/', {"email": "logout@example.com", "password": "StrongPass123!"})
        self.access = response.data['access']
        self.refresh = response.data['refresh']

    def test_logout_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        response = self.client.post('/api/auth/logout/', {"refresh": self.refresh})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_unauthenticated(self):
        response = self.client.post('/api/auth/logout/', {"refresh": self.refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        response = self.client.post('/api/auth/logout/', {"refresh": "invalidtoken"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class JWTValidationTest(APITestCase):
    """Tests for JWT token validation (#174)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='jwt@example.com', username='jwtuser', password='StrongPass123!'
        )
        response = self.client.post('/api/auth/login/', {"email": "jwt@example.com", "password": "StrongPass123!"})
        self.access = response.data['access']
        self.refresh = response.data['refresh']

    def test_valid_token_accesses_me(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'jwt@example.com')

    def test_invalid_token_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalidtoken123')
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_no_token_rejected(self):
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_blacklisted_refresh_cannot_be_reused(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        self.client.post('/api/auth/logout/', {"refresh": self.refresh})
        response = self.client.post('/api/auth/logout/', {"refresh": self.refresh})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TokenRefreshRaceConditionTest(APITestCase):
    """Regression tests for Issue #394 – authentication race conditions."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='refresh@example.com', username='refreshuser', password='StrongPass123!'
        )
        response = self.client.post(
            '/api/auth/login/', {"email": "refresh@example.com", "password": "StrongPass123!"}
        )
        self.access = response.data['access']
        self.refresh = response.data['refresh']

    def test_refresh_returns_new_tokens(self):
        response = self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotEqual(response.data['access'], self.access)

    def test_refresh_missing_token_returns_400(self):
        response = self.client.post('/api/auth/refresh/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_invalid_token_returns_401(self):
        response = self.client.post('/api/auth/refresh/', {"refresh": "notavalidtoken"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_cannot_be_reused(self):
        """Regression: same refresh token used twice must be rejected (simulates race condition outcome)."""
        r1 = self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        r2 = self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.assertEqual(r2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_new_refresh_token_is_usable(self):
        r1 = self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        r2 = self.client.post('/api/auth/refresh/', {"refresh": r1.data['refresh']})
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_old_access_token_still_valid_after_refresh(self):
        self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logged_out_refresh_token_cannot_be_refreshed(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        self.client.post('/api/auth/logout/', {"refresh": self.refresh})
        response = self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserPreferencesTest(APITestCase):
    """Tests for user preference and cultural onboarding fields (M4-12 / #343, M4-11 / #342)."""

    CULTURAL_FIELDS = ['cultural_interests', 'regional_ties', 'religious_preferences', 'event_interests']

    def setUp(self):
        self.user = User.objects.create_user(
            email='cultural@example.com', username='culturaluser', password='StrongPass123!'
        )
        response = self.client.post(
            '/api/auth/login/', {"email": "cultural@example.com", "password": "StrongPass123!"}
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')

    def test_default_lists_are_empty(self):
        for field in self.CULTURAL_FIELDS:
            self.assertEqual(getattr(self.user, field), [])

    def test_me_returns_cultural_fields(self):
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in self.CULTURAL_FIELDS:
            self.assertEqual(response.data[field], [])

    def test_patch_updates_all_cultural_fields(self):
        payload = {
            'cultural_interests': ['Mediterranean cuisine', 'Fermentation'],
            'regional_ties': ['Aegean', 'Black Sea'],
            'religious_preferences': ['Halal'],
            'event_interests': ['Ramadan', 'Wedding'],
        }
        response = self.client.patch('/api/users/me/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field, expected in payload.items():
            self.assertEqual(response.data[field], expected)
        self.user.refresh_from_db()
        for field, expected in payload.items():
            self.assertEqual(getattr(self.user, field), expected)

    def test_patch_partial_does_not_clear_other_fields(self):
        self.user.regional_ties = ['Aegean']
        self.user.save()
        response = self.client.patch(
            '/api/users/me/', {'cultural_interests': ['Vegan']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['cultural_interests'], ['Vegan'])
        self.assertEqual(response.data['regional_ties'], ['Aegean'])

    def test_patch_can_clear_field_with_empty_list(self):
        self.user.cultural_interests = ['Vegan']
        self.user.save()
        response = self.client.patch(
            '/api/users/me/', {'cultural_interests': []}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['cultural_interests'], [])

    def test_patch_rejects_non_list(self):
        response = self.client.patch(
            '/api/users/me/', {'cultural_interests': 'Vegan'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cultural_interests', response.data)

    def test_patch_rejects_non_string_items(self):
        response = self.client.patch(
            '/api/users/me/', {'event_interests': [123, 'Wedding']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('event_interests', response.data)

    def test_patch_rejects_overlong_item(self):
        response = self.client.patch(
            '/api/users/me/', {'cultural_interests': ['x' * 101]}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cultural_interests', response.data)

    def test_patch_unauthenticated_rejected(self):
        self.client.credentials()
        response = self.client.patch(
            '/api/users/me/', {'cultural_interests': ['Vegan']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_ignores_sensitive_fields(self):
        """
        Regression test: PATCH /api/users/me/ should only update allowed preference fields.
        It must ignore sensitive fields like email, role, or is_staff to prevent privilege escalation.
        """
        response = self.client.patch(
            '/api/users/me/',
            {
                'email': 'hijack@example.com',
                'role': 'admin',
                'is_staff': True,
                'cultural_interests': ['Vegan']
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'cultural@example.com')
        self.assertEqual(self.user.role, User.Role.USER)
        self.assertFalse(self.user.is_staff)
        self.assertEqual(self.user.cultural_interests, ['Vegan'])


class ContactabilityProfileTest(APITestCase):
    """Tests for messaging contactability preference (M4-11 / #342)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='contact@example.com', username='contactuser', password='StrongPass123!'
        )
        response = self.client.post(
            '/api/auth/login/', {"email": "contact@example.com", "password": "StrongPass123!"}
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')

    def test_default_is_contactable_true(self):
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_contactable'])

    def test_patch_can_disable_contactability(self):
        response = self.client.patch('/api/users/me/', {'is_contactable': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_contactable'])
        
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_contactable)

    def test_patch_can_reenable_contactability(self):
        self.user.is_contactable = False
        self.user.save()
        
        response = self.client.patch('/api/users/me/', {'is_contactable': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_contactable'])
        
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_contactable)


class TokenRefreshTest(APITestCase):
    """Tests for POST /api/auth/token/refresh/ (Issue #405)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='refresh@example.com', username='refreshuser', password='StrongPass123!'
        )
        response = self.client.post('/api/auth/login/', {"email": "refresh@example.com", "password": "StrongPass123!"})
        self.access = response.data['access']
        self.refresh = response.data['refresh']

    def test_refresh_success(self):
        response = self.client.post('/api/auth/token/refresh/', {"refresh": self.refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotEqual(response.data['refresh'], self.refresh)

    def test_refresh_invalid_token(self):
        response = self.client.post('/api/auth/token/refresh/', {"refresh": "invalidtoken"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['code'], 'token_not_valid')

    def test_refresh_missing_token(self):
        response = self.client.post('/api/auth/token/refresh/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_blacklisted_token(self):
        # Use it once to rotate it and blacklist the old one
        self.client.post('/api/auth/token/refresh/', {"refresh": self.refresh})
        # Use the old one again
        response = self.client.post('/api/auth/token/refresh/', {"refresh": self.refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['code'], 'token_not_valid')

    def test_refresh_wrong_secret_key(self):
        # Manually create a token signed with a different secret
        from rest_framework_simplejwt.tokens import RefreshToken
        import jwt
        
        refresh = RefreshToken.for_user(self.user)
        payload = refresh.payload
        bad_token = jwt.encode(payload, 'wrong-secret-key', algorithm='HS256')
        
        response = self.client.post('/api/auth/token/refresh/', {"refresh": bad_token})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['code'], 'token_not_valid')


class PublicUserProfileTest(APITestCase):
    """Tests for GET /api/users/<username>/ (Issue #582)."""

    PUBLIC_FIELDS = [
        'username', 'bio', 'region', 'cultural_interests',
        'religious_preferences', 'event_interests', 'created_at',
        'recipe_count', 'story_count',
    ]
    SENSITIVE_FIELDS = ['email', 'is_contactable', 'password']

    def setUp(self):
        self.alice = User.objects.create_user(
            email='alice@example.com',
            username='alice',
            password='StrongPass123!',
            bio='Loves slow cooking.',
            region='Aegean',
            cultural_interests=['Mediterranean cuisine'],
            religious_preferences=['Halal'],
            event_interests=['Wedding'],
        )
        self.bob = User.objects.create_user(
            email='bob@example.com',
            username='bob',
            password='StrongPass123!',
        )

    def test_public_profile_returns_200_for_existing_user(self):
        response = self.client.get('/api/users/alice/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in self.PUBLIC_FIELDS:
            self.assertIn(field, response.data)
        self.assertEqual(response.data['username'], 'alice')
        self.assertEqual(response.data['bio'], 'Loves slow cooking.')
        self.assertEqual(response.data['region'], 'Aegean')
        self.assertEqual(response.data['cultural_interests'], ['Mediterranean cuisine'])
        self.assertEqual(response.data['religious_preferences'], ['Halal'])
        self.assertEqual(response.data['event_interests'], ['Wedding'])

    def test_public_profile_excludes_sensitive_fields(self):
        response = self.client.get('/api/users/alice/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in self.SENSITIVE_FIELDS:
            self.assertNotIn(field, response.data)

    def test_public_profile_404_for_unknown_username(self):
        response = self.client.get('/api/users/ghost/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_profile_recipe_and_story_counts(self):
        from apps.recipes.models import Recipe
        from apps.stories.models import Story

        Recipe.objects.create(
            title='Alice Recipe 1', description='d', author=self.alice, is_published=True,
        )
        Recipe.objects.create(
            title='Alice Recipe 2', description='d', author=self.alice, is_published=True,
        )
        Recipe.objects.create(
            title='Alice Draft', description='d', author=self.alice, is_published=False,
        )
        Recipe.objects.create(
            title='Bob Recipe', description='d', author=self.bob, is_published=True,
        )
        Story.objects.create(
            title='Alice Story', body='b', author=self.alice, is_published=True,
        )
        Story.objects.create(
            title='Alice Draft Story', body='b', author=self.alice, is_published=False,
        )

        response = self.client.get('/api/users/alice/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['recipe_count'], 2)
        self.assertEqual(response.data['story_count'], 1)

        response = self.client.get('/api/users/bob/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['recipe_count'], 1)
        self.assertEqual(response.data['story_count'], 0)

    def test_users_me_still_works(self):
        login = self.client.post(
            '/api/auth/login/',
            {"email": "alice@example.com", "password": "StrongPass123!"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'alice@example.com')
        self.assertEqual(response.data['username'], 'alice')

    def test_authenticated_visitor_to_other_profile_does_not_see_email(self):
        login = self.client.post(
            '/api/auth/login/',
            {"email": "alice@example.com", "password": "StrongPass123!"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')
        response = self.client.get('/api/users/bob/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in self.SENSITIVE_FIELDS:
            self.assertNotIn(field, response.data)
