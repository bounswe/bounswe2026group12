from django.test import TestCase, RequestFactory
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.common.middleware import JWTAuthenticationMiddleware

User = get_user_model()

class MiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = JWTAuthenticationMiddleware(lambda r: JsonResponse({"detail": "OK"}))
        self.user = User.objects.create_user(email='test@example.com', username='testuser', password='password123')

    def test_middleware_blocks_anonymous_post_to_api(self):
        request = self.factory.post('/api/some-endpoint/')
        response = self.middleware.process_request(request)
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_middleware_allows_anonymous_get_to_api(self):
        request = self.factory.get('/api/some-endpoint/')
        response = self.middleware.process_request(request)
        self.assertIsNone(response)  # None means continue to next middleware/view

    def test_middleware_allows_exempt_post(self):
        request = self.factory.post('/api/auth/login/')
        response = self.middleware.process_request(request)
        self.assertIsNone(response)

    def test_middleware_allows_authenticated_post(self):
        request = self.factory.post('/api/some-endpoint/')
        request.user = self.user
        response = self.middleware.process_request(request)
        self.assertIsNone(response)

    def test_middleware_supports_force_authenticate(self):
        request = self.factory.post('/api/some-endpoint/')
        request._force_auth_user = self.user
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
        self.assertEqual(request.user, self.user)

    def test_middleware_authenticates_valid_jwt(self):
        """A valid Bearer token in the header attaches the user (#530 gap)."""
        from rest_framework_simplejwt.tokens import RefreshToken
        access = str(RefreshToken.for_user(self.user).access_token)
        request = self.factory.post(
            '/api/some-endpoint/',
            HTTP_AUTHORIZATION=f'Bearer {access}',
        )
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
        self.assertEqual(request.user, self.user)

    def test_middleware_handles_malformed_jwt_gracefully(self):
        """A malformed token does not crash; the request continues unauthenticated.

        The downstream 401 enforcement still fires because no user was attached,
        but the middleware itself must not propagate the JWT decode error.
        """
        request = self.factory.post(
            '/api/some-endpoint/',
            HTTP_AUTHORIZATION='Bearer not.a.valid.jwt',
        )
        response = self.middleware.process_request(request)
        # No authenticated user, so the write-method guard kicks in with 401
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
