from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.recipes.models import Recipe, Comment, Vote

User = get_user_model()


class VoteAPITests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='author', email='author@example.com', password='password123'
        )
        self.voter = User.objects.create_user(
            username='voter', email='voter@example.com', password='password123'
        )
        self.other = User.objects.create_user(
            username='other', email='other@example.com', password='password123'
        )

        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            description='Test description',
            author=self.author,
            qa_enabled=True,
            is_published=True,
        )

        self.comment = Comment.objects.create(
            recipe=self.recipe,
            author=self.author,
            body='A helpful comment',
            type='COMMENT',
        )

        self.vote_url = f'/api/comments/{self.comment.id}/vote/'
        self.comment_url = f'/api/recipes/{self.recipe.id}/comments/'

    # ------------------------------------------------------------------
    # Auth guard
    # ------------------------------------------------------------------

    def test_anon_post_returns_401(self):
        """Unauthenticated POST to /vote/ must return 401."""
        response = self.client.post(self.vote_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Vote.objects.count(), 0)

    # ------------------------------------------------------------------
    # Toggle behaviour
    # ------------------------------------------------------------------

    def test_first_vote_creates_and_returns_201(self):
        """First POST by an authenticated user creates a Vote and returns 201."""
        self.client.force_authenticate(user=self.voter)
        response = self.client.post(self.vote_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'voted')
        self.assertEqual(Vote.objects.filter(comment=self.comment, user=self.voter).count(), 1)

    def test_second_vote_from_same_user_toggles_off_and_returns_200(self):
        """Second POST from the same user deletes the Vote and returns 200."""
        self.client.force_authenticate(user=self.voter)
        self.client.post(self.vote_url)  # first vote

        response = self.client.post(self.vote_url)  # toggle off
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'unvoted')
        self.assertEqual(Vote.objects.filter(comment=self.comment, user=self.voter).count(), 0)

    # ------------------------------------------------------------------
    # Multi-user independence
    # ------------------------------------------------------------------

    def test_separate_users_vote_independently(self):
        """Two different users can both vote; their votes are independent."""
        self.client.force_authenticate(user=self.voter)
        r1 = self.client.post(self.vote_url)
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.other)
        r2 = self.client.post(self.vote_url)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Vote.objects.filter(comment=self.comment).count(), 2)

    # ------------------------------------------------------------------
    # helpful_count
    # ------------------------------------------------------------------

    def test_helpful_count_reflects_total_votes(self):
        """helpful_count in the comment list equals the number of votes cast."""
        Vote.objects.create(user=self.voter, comment=self.comment)
        Vote.objects.create(user=self.other, comment=self.comment)

        self.client.force_authenticate(user=self.voter)
        response = self.client.get(self.comment_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        comment_data = next(c for c in results if c['id'] == self.comment.id)
        self.assertEqual(comment_data['helpful_count'], 2)

    # ------------------------------------------------------------------
    # has_voted
    # ------------------------------------------------------------------

    def test_has_voted_true_only_for_caller(self):
        """has_voted is True for the user who voted, False for everyone else."""
        Vote.objects.create(user=self.voter, comment=self.comment)

        # Voter sees has_voted=True
        self.client.force_authenticate(user=self.voter)
        response = self.client.get(self.comment_url)
        results = response.data.get('results', response.data)
        comment_data = next(c for c in results if c['id'] == self.comment.id)
        self.assertTrue(comment_data['has_voted'])

        # Other authenticated user sees has_voted=False
        self.client.force_authenticate(user=self.other)
        response = self.client.get(self.comment_url)
        results = response.data.get('results', response.data)
        comment_data = next(c for c in results if c['id'] == self.comment.id)
        self.assertFalse(comment_data['has_voted'])

    def test_has_voted_false_for_anon(self):
        """has_voted is False when the caller is unauthenticated."""
        Vote.objects.create(user=self.voter, comment=self.comment)

        response = self.client.get(self.comment_url)
        results = response.data.get('results', response.data)
        comment_data = next(c for c in results if c['id'] == self.comment.id)
        self.assertFalse(comment_data['has_voted'])
