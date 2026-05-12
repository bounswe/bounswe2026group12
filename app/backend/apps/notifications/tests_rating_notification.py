from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from apps.recipes.models import Rating, Recipe

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username, email=f'{username}@example.com', password='TestPass123!',
    )


class RatingNotificationSignalTests(TestCase):
    def setUp(self):
        self.author = make_user('author')
        self.rater = make_user('rater')
        self.recipe = Recipe.objects.create(
            title="Author's Recipe", description='A test recipe',
            author=self.author, is_published=True,
        )

    def test_rating_creates_one_notification_for_author(self):
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=4)
        self.assertEqual(Notification.objects.count(), 1)
        notif = Notification.objects.get()
        self.assertEqual(notif.recipient, self.author)
        self.assertEqual(notif.actor, self.rater)
        self.assertEqual(notif.recipe, self.recipe)
        self.assertEqual(notif.notification_type, Notification.NotificationType.RATING)
        self.assertFalse(notif.is_read)
        self.assertIn(self.rater.username, notif.message)
        self.assertIn(self.recipe.title, notif.message)

    def test_score_update_does_not_create_second_notification(self):
        rating = Rating.objects.create(user=self.rater, recipe=self.recipe, score=4)
        self.assertEqual(Notification.objects.count(), 1)
        rating.score = 2
        rating.save()
        self.assertEqual(Notification.objects.count(), 1)

    def test_no_self_notification_when_author_rates_own_recipe(self):
        # Blocked at the API, but the signal guards too.
        Rating.objects.create(user=self.author, recipe=self.recipe, score=5)
        self.assertEqual(Notification.objects.count(), 0)

    def test_multiple_raters_each_notify_author(self):
        other = make_user('other')
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=4)
        Rating.objects.create(user=other, recipe=self.recipe, score=3)
        self.assertEqual(Notification.objects.filter(notification_type='rating').count(), 2)
        recipients = set(Notification.objects.values_list('recipient', flat=True))
        self.assertEqual(recipients, {self.author.id})


class NotificationSerializerTypeTests(TestCase):
    def setUp(self):
        self.author = make_user('author')
        self.rater = make_user('rater')
        self.recipe = Recipe.objects.create(
            title="Author's Recipe", description='A test recipe',
            author=self.author, is_published=True,
        )

    def test_serializer_exposes_notification_type(self):
        Rating.objects.create(user=self.rater, recipe=self.recipe, score=5)
        notif = Notification.objects.get()
        data = NotificationSerializer(notif).data
        self.assertIn('notification_type', data)
        self.assertEqual(data['notification_type'], 'rating')
