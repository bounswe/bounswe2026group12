"""Login flow reliability regression tests (#392, #TD-01).

Multiple demo attendees hit login errors during the MVP demo. This suite pins
down the backend half of the login contract that the web and mobile clients
retry against:

* the login (token-obtain) endpoint returns a clean, well-shaped 4xx for bad
  credentials, missing fields, an empty body, and a garbage body, and never a
  500 with a leaked stack trace;
* ``auth/token/refresh/`` behaves correctly for a valid, an expired, a
  malformed, and a blacklisted refresh token;
* a protected endpoint answers ``401 {"code": "token_not_valid"}`` (not 403,
  not 500) for an expired or garbage access token, so clients can branch on it;
* the wrong HTTP method on the login route is a plain ``405``, not a blank 500.

The session-rotation/logout lifecycle is covered separately in
``apps/users/tests_session.py`` (#393); a couple of access-token cases overlap
on purpose so this file documents the full login-reliability contract on its
own. The remaining demo-login flakiness is the mobile client not handling
``401 token_not_valid`` (tracked in #405), not a backend defect.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

User = get_user_model()

LOGIN_URL = '/api/auth/login/'
REFRESH_URL = '/api/auth/token/refresh/'
LOGOUT_URL = '/api/auth/logout/'
ME_URL = '/api/users/me/'

EMAIL = 'login-reliability@example.com'
PASSWORD = 'StrongPass123!'


def _is_server_error(response):
    return response.status_code >= 500


class LoginEndpointReliabilityTest(APITestCase):
    """The login endpoint must answer every malformed request with a 4xx."""

    def setUp(self):
        self.user = User.objects.create_user(
            email=EMAIL, username='loginreliabilityuser', password=PASSWORD
        )

    def test_valid_credentials_return_access_and_refresh(self):
        response = self.client.post(LOGIN_URL, {'email': EMAIL, 'password': PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(response.data['access'])
        self.assertTrue(response.data['refresh'])

    def test_wrong_password_returns_400_with_json_error_no_stack_trace(self):
        response = self.client.post(LOGIN_URL, {'email': EMAIL, 'password': 'wrong-password'})
        self.assertFalse(_is_server_error(response))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsInstance(response.data, dict)
        self.assertIn('non_field_errors', response.data)
        # The body is the serializer's error dict, never a rendered traceback.
        self.assertNotIn('Traceback', response.content.decode())

    def test_missing_password_returns_400_field_error(self):
        response = self.client.post(LOGIN_URL, {'email': EMAIL})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_missing_email_returns_400_field_error(self):
        response = self.client.post(LOGIN_URL, {'password': PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_empty_body_returns_400_not_500(self):
        response = self.client.post(LOGIN_URL)
        self.assertFalse(_is_server_error(response))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn('password', response.data)

    def test_garbage_json_body_returns_400_not_500(self):
        response = self.client.post(
            LOGIN_URL, data='}{ this is not valid json', content_type='application/json'
        )
        self.assertFalse(_is_server_error(response))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_object_json_body_returns_400_not_500(self):
        response = self.client.post(LOGIN_URL, data=['not', 'an', 'object'], format='json')
        self.assertFalse(_is_server_error(response))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_method_returns_405_not_blank_500(self):
        response = self.client.get(LOGIN_URL)
        self.assertFalse(_is_server_error(response))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class TokenRefreshReliabilityTest(APITestCase):
    """``auth/token/refresh/`` must rotate valid tokens and reject the rest."""

    def setUp(self):
        self.user = User.objects.create_user(
            email=EMAIL, username='refreshreliabilityuser', password=PASSWORD
        )
        login = self.client.post(LOGIN_URL, {'email': EMAIL, 'password': PASSWORD})
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.access = login.data['access']
        self.refresh = login.data['refresh']

    def test_valid_refresh_returns_new_access(self):
        response = self.client.post(REFRESH_URL, {'refresh': self.refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertTrue(response.data['access'])
        self.assertNotEqual(response.data['access'], self.access)

    def test_missing_refresh_returns_400(self):
        response = self.client.post(REFRESH_URL, {})
        self.assertFalse(_is_server_error(response))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_refresh_returns_401_token_not_valid(self):
        token = RefreshToken.for_user(self.user)
        # Push the expiry comfortably into the past without sleeping.
        token.set_exp(from_time=timezone.now() - timedelta(days=120))
        response = self.client.post(REFRESH_URL, {'refresh': str(token)})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('code'), 'token_not_valid')

    def test_malformed_refresh_returns_401_token_not_valid(self):
        response = self.client.post(REFRESH_URL, {'refresh': 'not-a-real.jwt.token'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('code'), 'token_not_valid')

    def test_blacklisted_refresh_after_logout_returns_401_token_not_valid(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        logout = self.client.post(LOGOUT_URL, {'refresh': self.refresh})
        self.assertEqual(logout.status_code, status.HTTP_205_RESET_CONTENT)
        self.client.credentials()
        response = self.client.post(REFRESH_URL, {'refresh': self.refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('code'), 'token_not_valid')


class ProtectedEndpointTokenContractTest(APITestCase):
    """A protected endpoint must reject bad access tokens with token_not_valid.

    Overlaps intentionally with ``tests_session.py`` so this file states the
    full login-reliability contract; clients (``app/mobile``) branch on the
    ``code`` field, so 403 or 500 here would break their refresh-and-retry.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email=EMAIL, username='guardreliabilityuser', password=PASSWORD
        )

    def test_expired_access_token_returns_401_token_not_valid(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(from_time=timezone.now() - timedelta(hours=2))
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('code'), 'token_not_valid')

    def test_garbage_bearer_token_returns_401_token_not_valid(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer complete-garbage-token')
        response = self.client.get(ME_URL)
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(_is_server_error(response))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('code'), 'token_not_valid')

    def test_valid_access_token_reaches_protected_endpoint(self):
        token = AccessToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], EMAIL)
