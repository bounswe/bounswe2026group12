from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class UserModelTest(APITestCase):
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


class AuthAPITest(APITestCase):
    """API-level tests for Auth endpoints (Issue #151)."""

    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.me_url = reverse('me')
        
        self.user_data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'StrongPass123!',
            'bio': 'Test bio',
            'region': 'Istanbul',
            'preferred_language': 'tr'
        }
        
        # Create a user for login/logout tests
        self.user = User.objects.create_user(
            email='auth@example.com',
            username='authuser',
            password='AuthPass123!'
        )

    def test_register_success(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], self.user_data['email'])

    def test_register_duplicate_email(self):
        self.client.post(self.register_url, self.user_data)
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        login_data = {
            'email': 'auth@example.com',
            'password': 'AuthPass123!'
        }
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_fail(self):
        login_data = {
            'email': 'auth@example.com',
            'password': 'WrongPassword'
        }
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_me_success(self):
        # Obtain token
        login_data = {'email': 'auth@example.com', 'password': 'AuthPass123!'}
        login_res = self.client.post(self.login_url, login_data)
        token = login_res.data['access']
        
        # Set auth header
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'auth@example.com')

    def test_get_me_unauthorized(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_success(self):
        # Obtain token
        login_data = {'email': 'auth@example.com', 'password': 'AuthPass123!'}
        login_res = self.client.post(self.login_url, login_data)
        access_token = login_res.data['access']
        refresh_token = login_res.data['refresh']
        
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)
        response = self.client.post(self.logout_url, {'refresh': refresh_token})
        
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer some-invalid-token')
        response = self.client.post(self.logout_url, {'refresh': 'some-invalid-refresh'})
        # Should be 401 because authentication fails first
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
