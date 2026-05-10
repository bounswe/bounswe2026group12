"""Coverage-gap tests for the users app (#530).

Targets uncovered branches in users/models.py and users/views.py:

- UserManager.create_user: ValueError when email or username is missing
- TokenRefreshView: OutstandingToken.DoesNotExist branch
- TokenRefreshView: generic Exception branch (e.g. user referenced by token deleted)
- Role choices: superuser default, role assignment, role enum surface area
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

User = get_user_model()


class UserManagerEdgeCaseTests(TestCase):
    """Validation branches of the custom UserManager.create_user."""

    def test_create_user_without_email_raises(self):
        with self.assertRaises(ValueError) as ctx:
            User.objects.create_user(email='', username='someone', password='x')
        self.assertIn('Email', str(ctx.exception))

    def test_create_user_without_username_raises(self):
        with self.assertRaises(ValueError) as ctx:
            User.objects.create_user(email='a@b.com', username='', password='x')
        self.assertIn('Username', str(ctx.exception))

    def test_create_user_normalizes_email_domain(self):
        u = User.objects.create_user(
            email='Test@EXAMPLE.com', username='normal-eml', password='x',
        )
        # BaseUserManager.normalize_email lowercases the domain part
        self.assertEqual(u.email, 'Test@example.com')

    def test_create_superuser_sets_admin_role_and_flags(self):
        admin = User.objects.create_superuser(
            email='su@example.com', username='su', password='x',
        )
        self.assertEqual(admin.role, User.Role.ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)


class RoleChoicesTests(TestCase):
    """Role values can be assigned and round-trip through the DB."""

    def test_role_choices_surface(self):
        # Pin the enum surface area so dropping a role becomes a visible diff
        values = {choice[0] for choice in User.Role.choices}
        self.assertEqual(values, {'user', 'moderator', 'admin'})

    def test_assigning_moderator_role_persists(self):
        u = User.objects.create_user(
            email='mod@example.com', username='moduser', password='x',
        )
        u.role = User.Role.MODERATOR
        u.save()
        u.refresh_from_db()
        self.assertEqual(u.role, User.Role.MODERATOR)


class TokenRefreshEdgeCaseTests(APITestCase):
    """Pin the rarely-hit error branches of TokenRefreshView.post."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='ref-edge@example.com',
            username='ref-edge',
            password='StrongPass123!',
        )
        response = self.client.post(
            '/api/auth/login/',
            {"email": "ref-edge@example.com", "password": "StrongPass123!"},
        )
        self.refresh = response.data['refresh']

    def test_refresh_with_outstanding_token_row_missing_returns_401(self):
        """If the OutstandingToken row is gone, the refresh path returns 401.

        Simulates a race / data-cleanup scenario where the signed JWT decodes
        cleanly but the server-side tracking row no longer exists.
        """
        token = RefreshToken(self.refresh)
        OutstandingToken.objects.filter(jti=token['jti']).delete()

        res = self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.data.get('code'), 'token_not_valid')

    def test_refresh_when_token_user_deleted_returns_400(self):
        """If the user referenced by the token is gone, the outer except returns 400."""
        self.user.delete()
        res = self.client.post('/api/auth/refresh/', {"refresh": self.refresh})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', res.data)
