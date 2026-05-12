from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.recipes.models import Rating, Recipe

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username, email=f'{username}@example.com', password='password123',
    )


class RecipeRatingAPITests(APITestCase):
    def setUp(self):
        self.author = make_user('author')
        self.rater = make_user('rater')
        self.other = make_user('other')
        self.recipe = Recipe.objects.create(
            title='Test Recipe', description='A test recipe',
            author=self.author, is_published=True,
        )
        self.rate_url = f'/api/recipes/{self.recipe.id}/rate/'

    def test_anonymous_cannot_rate(self):
        response = self.client.post(self.rate_url, {'score': 4}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Rating.objects.count(), 0)

    def test_create_rating_returns_stats(self):
        self.client.force_authenticate(user=self.rater)
        response = self.client.post(self.rate_url, {'score': 4}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['rating_count'], 1)
        self.assertEqual(Decimal(response.data['average_rating']), Decimal('4.00'))
        self.assertEqual(response.data['user_rating'], 4)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.rating_count, 1)
        self.assertEqual(self.recipe.average_rating, Decimal('4.00'))
        self.assertEqual(Rating.objects.filter(recipe=self.recipe, user=self.rater).count(), 1)

    def test_re_rating_updates_without_duplicating(self):
        self.client.force_authenticate(user=self.rater)
        self.client.post(self.rate_url, {'score': 4}, format='json')
        response = self.client.post(self.rate_url, {'score': 2}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Rating.objects.filter(recipe=self.recipe, user=self.rater).count(), 1)
        self.assertEqual(response.data['rating_count'], 1)
        self.assertEqual(Decimal(response.data['average_rating']), Decimal('2.00'))
        self.assertEqual(response.data['user_rating'], 2)

    def test_re_rating_does_not_create_second_notification(self):
        self.client.force_authenticate(user=self.rater)
        self.client.post(self.rate_url, {'score': 4}, format='json')
        self.assertEqual(Notification.objects.filter(notification_type='rating').count(), 1)
        self.client.post(self.rate_url, {'score': 5}, format='json')
        self.assertEqual(Notification.objects.filter(notification_type='rating').count(), 1)

    def test_delete_rating_recomputes_stats(self):
        self.client.force_authenticate(user=self.rater)
        self.client.post(self.rate_url, {'score': 5}, format='json')
        response = self.client.delete(self.rate_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['rating_count'], 0)
        self.assertIsNone(response.data['average_rating'])
        self.assertIsNone(response.data['user_rating'])
        self.recipe.refresh_from_db()
        self.assertIsNone(self.recipe.average_rating)
        self.assertEqual(self.recipe.rating_count, 0)

    def test_delete_when_no_rating_is_idempotent(self):
        self.client.force_authenticate(user=self.rater)
        response = self.client.delete(self.rate_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['rating_count'], 0)
        self.assertIsNone(response.data['average_rating'])

    def test_average_across_users_rounded_to_two_dp(self):
        # Scores 5, 4, 4 -> 13 / 3 = 4.333... -> 4.33
        self.client.force_authenticate(user=self.rater)
        self.client.post(self.rate_url, {'score': 5}, format='json')
        self.client.force_authenticate(user=self.other)
        self.client.post(self.rate_url, {'score': 4}, format='json')
        third = make_user('third')
        self.client.force_authenticate(user=third)
        response = self.client.post(self.rate_url, {'score': 4}, format='json')
        self.assertEqual(response.data['rating_count'], 3)
        self.assertEqual(Decimal(response.data['average_rating']), Decimal('4.33'))
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('4.33'))

    def test_author_cannot_rate_own_recipe(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(self.rate_url, {'score': 5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Rating.objects.count(), 0)

    def test_out_of_range_score_rejected(self):
        self.client.force_authenticate(user=self.rater)
        for bad_score in (0, 6, -1, 100):
            response = self.client.post(self.rate_url, {'score': bad_score}, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Rating.objects.count(), 0)

    def test_missing_score_rejected(self):
        self.client.force_authenticate(user=self.rater)
        response = self.client.post(self.rate_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RecipeRatingSerializerTests(APITestCase):
    def setUp(self):
        self.author = make_user('author')
        self.rater = make_user('rater')
        self.recipe = Recipe.objects.create(
            title='Test Recipe', description='A test recipe',
            author=self.author, is_published=True,
        )
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=3)

    def test_detail_exposes_rating_fields_for_anonymous(self):
        response = self.client.get(f'/api/recipes/{self.recipe.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['average_rating']), Decimal('3.00'))
        self.assertEqual(response.data['rating_count'], 1)
        self.assertIsNone(response.data['user_rating'])

    def test_detail_user_rating_is_callers_score(self):
        self.client.force_authenticate(user=self.rater)
        response = self.client.get(f'/api/recipes/{self.recipe.id}/')
        self.assertEqual(response.data['user_rating'], 3)

    def test_detail_user_rating_null_for_non_rater(self):
        other = make_user('other')
        self.client.force_authenticate(user=other)
        response = self.client.get(f'/api/recipes/{self.recipe.id}/')
        self.assertIsNone(response.data['user_rating'])

    def test_list_exposes_rating_fields(self):
        response = self.client.get('/api/recipes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        row = next(r for r in results if r['id'] == self.recipe.id)
        self.assertEqual(Decimal(row['average_rating']), Decimal('3.00'))
        self.assertEqual(row['rating_count'], 1)
        self.assertIsNone(row['user_rating'])


class RecipeRatingSignalTests(APITestCase):
    """Direct model-level checks on the denormalisation signals."""

    def setUp(self):
        self.author = make_user('author')
        self.recipe = Recipe.objects.create(
            title='Test Recipe', description='A test recipe',
            author=self.author, is_published=True,
        )

    def test_new_recipe_has_no_rating_stats(self):
        self.recipe.refresh_from_db()
        self.assertIsNone(self.recipe.average_rating)
        self.assertEqual(self.recipe.rating_count, 0)

    def test_stats_recompute_on_create_and_delete(self):
        u1, u2 = make_user('u1'), make_user('u2')
        Rating.objects.create(user=u1, recipe=self.recipe, score=2)
        Rating.objects.create(user=u2, recipe=self.recipe, score=5)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.rating_count, 2)
        self.assertEqual(self.recipe.average_rating, Decimal('3.50'))

        Rating.objects.filter(user=u1).delete()
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.rating_count, 1)
        self.assertEqual(self.recipe.average_rating, Decimal('5.00'))

        Rating.objects.filter(user=u2).delete()
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.rating_count, 0)
        self.assertIsNone(self.recipe.average_rating)

    def test_score_update_recomputes_average(self):
        u1 = make_user('u1')
        rating = Rating.objects.create(user=u1, recipe=self.recipe, score=1)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('1.00'))
        rating.score = 4
        rating.save()
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.average_rating, Decimal('4.00'))
        self.assertEqual(self.recipe.rating_count, 1)
