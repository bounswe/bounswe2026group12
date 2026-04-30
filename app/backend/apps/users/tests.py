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
        data = {"email": "login@example.com", "password": "StrongPass123!"}
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

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


class CulturalOnboardingTest(APITestCase):
    """Tests for cultural onboarding profile fields (M4-12 / #343)."""

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

    def test_patch_ignores_non_cultural_fields(self):
        response = self.client.patch(
            '/api/users/me/',
            {'email': 'hijack@example.com', 'role': 'admin', 'cultural_interests': ['Vegan']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'cultural@example.com')
        self.assertEqual(self.user.role, User.Role.USER)
        self.assertEqual(self.user.cultural_interests, ['Vegan'])
