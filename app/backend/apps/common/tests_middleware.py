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
