from django.contrib.auth import get_user_model
from django.test import TestCase
from apps.recipes.models import Recipe, Comment, Region
from apps.notifications.models import Notification

User = get_user_model()


def make_user(username, email=None):
    email = email or f"{username}@test.com"
    return User.objects.create_user(
        username=username,
        email=email,
        password="TestPass123!",
    )


def make_recipe(author):
    region = Region.objects.first()
    return Recipe.objects.create(
        title=f"{author.username}'s Recipe",
        description="A test recipe",
        author=author,
        region=region,
        qa_enabled=True,
        is_published=True,
    )


class NotificationSignalTests(TestCase):
    def setUp(self):
        self.author = make_user("author")
        self.questioner = make_user("questioner")
        self.recipe = make_recipe(self.author)

    # ------------------------------------------------------------------
    # Core: notification IS created
    # ------------------------------------------------------------------

    def test_notification_created_when_question_posted(self):
        """A QUESTION comment by a different user creates exactly one Notification."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="How long to cook?",
            type="QUESTION",
        )
        self.assertEqual(Notification.objects.count(), 1)

    def test_notification_recipient_is_recipe_author(self):
        """The created Notification is addressed to the recipe author."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="What temperature?",
            type="QUESTION",
        )
        notif = Notification.objects.get()
        self.assertEqual(notif.recipient, self.author)

    def test_notification_actor_is_questioner(self):
        """The actor on the Notification is the user who asked the question."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="Can I substitute butter?",
            type="QUESTION",
        )
        notif = Notification.objects.get()
        self.assertEqual(notif.actor, self.questioner)

    def test_notification_references_correct_recipe(self):
        """The Notification links back to the correct recipe."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="Any tips?",
            type="QUESTION",
        )
        notif = Notification.objects.get()
        self.assertEqual(notif.recipe, self.recipe)

    def test_notification_is_unread_by_default(self):
        """Newly created notifications have is_read=False."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="Is this gluten free?",
            type="QUESTION",
        )
        notif = Notification.objects.get()
        self.assertFalse(notif.is_read)

    def test_notification_message_contains_questioner_and_recipe(self):
        """The notification message mentions both the questioner and the recipe title."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="Is this vegan?",
            type="QUESTION",
        )
        notif = Notification.objects.get()
        self.assertIn(self.questioner.username, notif.message)
        self.assertIn(self.recipe.title, notif.message)

    # ------------------------------------------------------------------
    # Guard: self-question — no notification
    # ------------------------------------------------------------------

    def test_no_notification_when_author_asks_own_recipe(self):
        """Asking a question on your own recipe must NOT generate a notification."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.author,  # same as recipe.author
            body="My own question",
            type="QUESTION",
        )
        self.assertEqual(Notification.objects.count(), 0)

    # ------------------------------------------------------------------
    # Guard: regular comment — no notification
    # ------------------------------------------------------------------

    def test_no_notification_for_comment_type(self):
        """A COMMENT (not QUESTION) must NOT generate a notification."""
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="Great recipe!",
            type="COMMENT",
        )
        self.assertEqual(Notification.objects.count(), 0)

    # ------------------------------------------------------------------
    # Guard: update — no extra notification
    # ------------------------------------------------------------------

    def test_no_duplicate_notification_on_comment_update(self):
        """Updating an existing comment must NOT generate an additional notification."""
        comment = Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="Original question?",
            type="QUESTION",
        )
        self.assertEqual(Notification.objects.count(), 1)

        comment.body = "Updated question?"
        comment.save()

        # Still exactly one notification
        self.assertEqual(Notification.objects.count(), 1)

    # ------------------------------------------------------------------
    # Multiple questions → multiple notifications
    # ------------------------------------------------------------------

    def test_multiple_questions_create_multiple_notifications(self):
        """Each distinct question from different users generates its own notification."""
        third_user = make_user("third")
        Comment.objects.create(
            recipe=self.recipe,
            author=self.questioner,
            body="First question?",
            type="QUESTION",
        )
        Comment.objects.create(
            recipe=self.recipe,
            author=third_user,
            body="Second question?",
            type="QUESTION",
        )
        self.assertEqual(Notification.objects.count(), 2)
        recipients = Notification.objects.values_list('recipient', flat=True)
        self.assertTrue(all(r == self.author.id for r in recipients))
