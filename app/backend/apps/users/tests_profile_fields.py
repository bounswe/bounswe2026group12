import io
from PIL import Image
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User

class ProfileFieldsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)

    def test_update_display_name(self):
        url = reverse('me')
        data = {'display_name': 'Test Display Name'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, 'Test Display Name')
        self.assertEqual(response.data['display_name'], 'Test Display Name')

    def test_avatar_upload(self):
        url = reverse('me-avatar')
        
        # Create a dummy image
        file = io.BytesIO()
        image = Image.new('RGB', size=(100, 100), color=(255, 0, 0))
        image.save(file, 'jpeg')
        file.name = 'test.jpg'
        file.seek(0)

        response = self.client.post(url, {'avatar': file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.avatar.name.startswith('users/avatars/test'))
        self.assertIn('avatar_url', response.data)
        self.assertTrue(response.data['avatar_url'].startswith('http'))

    def test_avatar_url_defaults_to_null(self):
        url = reverse('me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['avatar_url'])
        self.assertEqual(response.data['display_name'], '')

    def test_public_profile_fields(self):
        url = reverse('public-user-profile', kwargs={'username': self.user.username})
        
        self.user.display_name = 'Public Name'
        self.user.save()

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Public Name')
        self.assertIn('avatar_url', response.data)
