"""Session lifecycle contract tests (#393, #TD-02).

These exercise the JWT session contract that web and mobile clients share:
login issues an access and refresh pair, the refresh endpoint rotates the
refresh token and blacklists the old one, an invalid access token is rejected
with code ``token_not_valid`` on protected endpoints, and logout invalidates
the refresh token. The numeric token lifetimes live in
``config/settings.py`` (``SIMPLE_JWT``) and are documented there; the mobile
client in ``app/mobile/src/services/httpClient.ts`` depends on them.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

LOGIN_URL = '/api/auth/login/'
REFRESH_URL = '/api/auth/token/refresh/'
LOGOUT_URL = '/api/auth/logout/'
ME_URL = '/api/users/me/'

PASSWORD = 'StrongPass123!'


class SessionLifecycleTest(APITestCase):
    """End-to-end coverage of the login / refresh / logout token flow."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='session@example.com', username='sessionuser', password=PASSWORD
        )
        login = self.client.post(LOGIN_URL, {'email': 'session@example.com', 'password': PASSWORD})
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.access = login.data['access']
        self.refresh = login.data['refresh']

    def _auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_login_returns_access_and_refresh(self):
        response = self.client.post(LOGIN_URL, {'email': 'session@example.com', 'password': PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(response.data['access'])
        self.assertTrue(response.data['refresh'])

    def test_refresh_returns_new_access_and_rotated_refresh(self):
        response = self.client.post(REFRESH_URL, {'refresh': self.refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        # ROTATE_REFRESH_TOKENS is on: a fresh refresh token is handed back.
        self.assertNotEqual(response.data['access'], self.access)
        self.assertNotEqual(response.data['refresh'], self.refresh)

    def test_rotated_refresh_token_is_usable(self):
        first = self.client.post(REFRESH_URL, {'refresh': self.refresh})
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        second = self.client.post(REFRESH_URL, {'refresh': first.data['refresh']})
        self.assertEqual(second.status_code, status.HTTP_200_OK)

    def test_old_refresh_token_is_blacklisted_after_rotation(self):
        first = self.client.post(REFRESH_URL, {'refresh': self.refresh})
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        # BLACKLIST_AFTER_ROTATION is on: the original refresh token must not work twice.
        reused = self.client.post(REFRESH_URL, {'refresh': self.refresh})
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(reused.data['code'], 'token_not_valid')

    def test_logout_invalidates_refresh_token(self):
        self._auth(self.access)
        logout = self.client.post(LOGOUT_URL, {'refresh': self.refresh})
        self.assertEqual(logout.status_code, status.HTTP_205_RESET_CONTENT)
        self.client.credentials()
        after = self.client.post(REFRESH_URL, {'refresh': self.refresh})
        self.assertEqual(after.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(after.data['code'], 'token_not_valid')

    def test_refresh_without_token_returns_400(self):
        response = self.client.post(REFRESH_URL, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProtectedEndpointTokenValidationTest(APITestCase):
    """A protected endpoint must reject bad access tokens with token_not_valid."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='guard@example.com', username='guarduser', password=PASSWORD
        )

    def test_valid_access_token_reaches_me(self):
        token = AccessToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'guard@example.com')

    def test_malformed_access_token_returns_token_not_valid(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer not.a.real.jwt')
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['code'], 'token_not_valid')

    def test_expired_access_token_returns_token_not_valid(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(from_time=timezone.now() - timedelta(hours=2))
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['code'], 'token_not_valid')

    def test_missing_access_token_is_unauthorized(self):
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
