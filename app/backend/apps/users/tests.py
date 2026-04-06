from django.test import TestCase
from django.contrib.auth import get_user_model

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
