from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import Rating, Recipe

User = get_user_model()


def _user(username):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password='StrongPass123!',
    )


def _recipe(author, title='Rated Recipe'):
    return Recipe.objects.create(
        title=title,
        description='Recipe for rating tests',
        author=author,
        is_published=True,
    )


class RatingSignalTests(TestCase):
    def setUp(self):
        self.author = _user('signal-author')
        self.rater_one = _user('signal-rater-one')
        self.rater_two = _user('signal-rater-two')
        self.recipe = _recipe(self.author)

    def test_recipe_rating_aggregates_track_create_update_and_delete(self):
        first = Rating.objects.create(user=self.rater_one, recipe=self.recipe, score=2)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('2.00'))
        self.assertEqual(self.recipe.rating_count, 1)

        second = Rating.objects.create(user=self.rater_two, recipe=self.recipe, score=5)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('3.50'))
        self.assertEqual(self.recipe.rating_count, 2)

        first.score = 4
        first.save()
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('4.50'))
        self.assertEqual(self.recipe.rating_count, 2)

        second.delete()
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('4.00'))
        self.assertEqual(self.recipe.rating_count, 1)


class RatingAPITests(APITestCase):
    def setUp(self):
        self.author = _user('rating-author')
        self.rater = _user('rating-rater')
        self.other_rater = _user('rating-other')
        self.recipe = _recipe(self.author)
        self.rate_url = reverse('recipe-rate', kwargs={'pk': self.recipe.pk})
        self.detail_url = reverse('recipe-detail', kwargs={'pk': self.recipe.pk})
        self.list_url = reverse('recipe-list')

    def test_post_rate_creates_rating_and_returns_stats(self):
        self.client.force_authenticate(user=self.rater)

        response = self.client.post(self.rate_url, {'score': 4}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Rating.objects.filter(recipe=self.recipe, user=self.rater).count(), 1)
        self.assertEqual(response.data['average_rating'], '4.00')
        self.assertEqual(response.data['rating_count'], 1)
        self.assertEqual(response.data['user_rating'], 4)

        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('4.00'))
        self.assertEqual(self.recipe.rating_count, 1)

    def test_post_rate_updates_existing_rating_without_creating_duplicate(self):
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=2)
        self.client.force_authenticate(user=self.rater)

        response = self.client.post(self.rate_url, {'score': 5}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Rating.objects.filter(recipe=self.recipe, user=self.rater).count(), 1)
        self.assertEqual(Rating.objects.get(recipe=self.recipe, user=self.rater).score, 5)
        self.assertEqual(response.data['average_rating'], '5.00')
        self.assertEqual(response.data['rating_count'], 1)
        self.assertEqual(response.data['user_rating'], 5)

    def test_delete_rate_removes_rating_and_returns_updated_stats(self):
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=4)
        Rating.objects.create(user=self.other_rater, recipe=self.recipe, score=2)
        self.client.force_authenticate(user=self.rater)

        response = self.client.delete(self.rate_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Rating.objects.filter(recipe=self.recipe, user=self.rater).exists())
        self.assertEqual(response.data['average_rating'], '2.00')
        self.assertEqual(response.data['rating_count'], 1)
        self.assertIsNone(response.data['user_rating'])

        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('2.00'))
        self.assertEqual(self.recipe.rating_count, 1)

    def test_author_cannot_rate_own_recipe(self):
        self.client.force_authenticate(user=self.author)

        response = self.client.post(self.rate_url, {'score': 5}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Rating.objects.count(), 0)

    def test_score_must_be_between_one_and_five(self):
        self.client.force_authenticate(user=self.rater)

        response = self.client.post(self.rate_url, {'score': 0}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('score', response.data)
        self.assertEqual(Rating.objects.count(), 0)

    def test_recipe_detail_exposes_rating_fields_for_authenticated_user(self):
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=4)
        Rating.objects.create(user=self.other_rater, recipe=self.recipe, score=5)
        self.client.force_authenticate(user=self.rater)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['average_rating'], '4.50')
        self.assertEqual(response.data['rating_count'], 2)
        self.assertEqual(response.data['user_rating'], 4)

    def test_recipe_list_exposes_null_user_rating_for_anonymous_requests(self):
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=4)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        recipe_data = next(item for item in results if item['id'] == self.recipe.id)
        self.assertEqual(recipe_data['average_rating'], '4.00')
        self.assertEqual(recipe_data['rating_count'], 1)
        self.assertIsNone(recipe_data['user_rating'])
