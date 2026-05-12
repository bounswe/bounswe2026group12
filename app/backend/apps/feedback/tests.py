from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Feedback
from unittest.mock import patch

User = get_user_model()

class FeedbackTests(APITestCase):
    def setUp(self):
        self.url = reverse('feedback-create')
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='password123'
        )

    def test_create_feedback_anonymous(self):
        """
        Happy path: anonymous user can submit feedback.
        """
        data = {'message': 'I love these recipes!'}
        response = self.client.post(self.url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertIn('created_at', response.data)
        self.assertNotIn('message', response.data) # Echo should be suppressed
        
        feedback = Feedback.objects.get(id=response.data['id'])
        self.assertEqual(feedback.message, 'I love these recipes!')
        self.assertIsNone(feedback.user)

    def test_create_feedback_authenticated(self):
        """
        Happy path: authenticated user feedback records the user FK.
        """
        self.client.force_authenticate(user=self.user)
        data = {'message': 'Andean recipes are great.'}
        response = self.client.post(self.url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        feedback = Feedback.objects.get(id=response.data['id'])
        self.assertEqual(feedback.message, 'Andean recipes are great.')
        self.assertEqual(feedback.user, self.user)

    def test_message_validation_blank(self):
        """
        Blank or whitespace-only messages should be rejected with 400.
        """
        data = {'message': '   '}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('message', response.data)

    def test_message_validation_too_short(self):
        """
        Messages shorter than 2 characters should be rejected.
        """
        data = {'message': 'a'}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_message_validation_too_long(self):
        """
        Messages longer than 2000 characters should be rejected.
        """
        data = {'message': 'a' * 2001}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_metadata_collection(self):
        """
        User-Agent and Referer (path) should be recorded.
        """
        user_agent = 'TestAgent/1.0'
        referer = 'http://testserver/home'
        response = self.client.post(
            self.url, 
            {'message': 'Metadata test'},
            HTTP_USER_AGENT=user_agent,
            HTTP_REFERER=referer
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback = Feedback.objects.get(id=response.data['id'])
        self.assertEqual(feedback.user_agent, user_agent)
        self.assertEqual(feedback.path, referer)

    def test_throttling_anonymous_mock(self):
        """
        Verify that the view uses the correct throttle classes.
        """
        from .views import FeedbackCreateView, FeedbackAnonThrottle
        view = FeedbackCreateView()
        # Mock a request with an anonymous user
        from django.http import HttpRequest
        request = HttpRequest()
        request.user = type('AnonymousUser', (), {'is_authenticated': False})()
        view.request = request
        
        throttles = view.get_throttles()
        self.assertTrue(any(isinstance(t, FeedbackAnonThrottle) for t in throttles))

    def test_throttling_authenticated_mock(self):
        """
        Verify that the view uses the correct throttle classes for authenticated users.
        """
        from .views import FeedbackCreateView, FeedbackUserThrottle
        view = FeedbackCreateView()
        # Mock a request with an authenticated user
        from django.http import HttpRequest
        request = HttpRequest()
        request.user = type('User', (), {'is_authenticated': True})()
        view.request = request
        
        throttles = view.get_throttles()
        self.assertTrue(any(isinstance(t, FeedbackUserThrottle) for t in throttles))
