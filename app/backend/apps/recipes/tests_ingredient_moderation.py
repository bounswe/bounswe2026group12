"""Tests for the ingredient/unit/dietary-tag moderation queue (#361, M6-10).

Covers the audit-field stamping on user submissions, the admin queue listing,
and the approve/reject endpoints under /api/moderation/lookups/.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import DietaryTag, Ingredient, Unit


User = get_user_model()


class LookupSubmissionAuditTests(APITestCase):
    """User submissions land as is_approved=False with submitted_by stamped."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='submitter@example.com',
            username='submitter',
            password='Pass123!',
        )

    def test_anonymous_listing_excludes_unapproved_ingredients(self):
        Ingredient.objects.create(name='TestSpice-Alpha', is_approved=True)
        Ingredient.objects.create(name='TestSpice-Beta', is_approved=False)

        response = self.client.get('/api/ingredients/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [i['name'] for i in response.data]
        self.assertIn('TestSpice-Alpha', names)
        self.assertNotIn('TestSpice-Beta', names)

    def test_authenticated_ingredient_submission_stamps_audit_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/ingredients/', {'name': 'TestSpice-Mod-001'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertFalse(response.data['is_approved'])

        ingredient = Ingredient.objects.get(name='TestSpice-Mod-001')
        self.assertFalse(ingredient.is_approved)
        self.assertEqual(ingredient.submitted_by, self.user)
        self.assertIsNotNone(ingredient.submitted_at)
        self.assertIsNone(ingredient.reviewed_by)
        self.assertIsNone(ingredient.reviewed_at)

        # Hidden from public list until approved.
        anon = self.client_class()
        public = anon.get('/api/ingredients/')
        self.assertNotIn('TestSpice-Mod-001', [i['name'] for i in public.data])

    def test_authenticated_unit_submission_stamps_audit_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/units/', {'name': 'testunit-mod-001'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        unit = Unit.objects.get(name='testunit-mod-001')
        self.assertEqual(unit.submitted_by, self.user)
        self.assertIsNotNone(unit.submitted_at)
        self.assertFalse(unit.is_approved)

    def test_authenticated_dietary_tag_submission_stamps_audit_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/dietary-tags/', {'name': 'testdiet-mod-001'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        tag = DietaryTag.objects.get(name='testdiet-mod-001')
        self.assertEqual(tag.submitted_by, self.user)
        self.assertIsNotNone(tag.submitted_at)
        self.assertFalse(tag.is_approved)

    def test_submitted_by_cannot_be_spoofed_via_request_body(self):
        """Even if a user posts submitted_by=<other>, the server stamps the actual user."""
        other = User.objects.create_user(
            email='other@example.com', username='other', password='Pass123!',
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            '/api/ingredients/',
            {'name': 'TestSpice-Spoof-001', 'submitted_by': other.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        ingredient = Ingredient.objects.get(name='TestSpice-Spoof-001')
        self.assertEqual(ingredient.submitted_by, self.user)

    def test_existing_ingredient_dedup_still_returns_400(self):
        """The submission dedup behavior (400 on case-insensitive duplicate) is
        unchanged by the audit-fields migration."""
        Ingredient.objects.create(name='TestSpice-Dup-001', is_approved=True)
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/ingredients/', {'name': '  testspice-dup-001 '})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Ingredient.objects.filter(name__iexact='testspice-dup-001').count(), 1,
        )

    def test_existing_unit_dedup_still_returns_400(self):
        Unit.objects.create(name='TestUnit-Dup-001', is_approved=True)
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/units/', {'name': 'testunit-dup-001'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Unit.objects.filter(name__iexact='testunit-dup-001').count(), 1,
        )


class LookupModerationQueueTests(APITestCase):
    """Admin-only queue listing across moderated lookup types."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(
            email='admin@example.com', username='admin', password='Pass123!',
        )
        cls.user = User.objects.create_user(
            email='user@example.com', username='user', password='Pass123!',
        )

        cls.pending_ingredient = Ingredient.objects.create(
            name='QueueSpice-001', is_approved=False, submitted_by=cls.user,
        )
        cls.pending_unit = Unit.objects.create(
            name='queueunit-001', is_approved=False, submitted_by=cls.user,
        )
        cls.pending_diet = DietaryTag.objects.create(
            name='queuediet-001', is_approved=False, submitted_by=cls.user,
        )
        Ingredient.objects.create(name='QueueApproved-001', is_approved=True)

    def test_anonymous_user_cannot_access_queue(self):
        response = self.client.get('/api/moderation/lookups/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_authenticated_user_cannot_access_queue(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/moderation/lookups/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_pending_across_lookup_types(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/lookups/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data['results']
        rows_by_type_name = {(r['type'], r['name']) for r in rows}
        self.assertIn(('ingredient', 'QueueSpice-001'), rows_by_type_name)
        self.assertIn(('unit', 'queueunit-001'), rows_by_type_name)
        self.assertIn(('dietary-tag', 'queuediet-001'), rows_by_type_name)
        # Approved entries are excluded from the default pending view.
        self.assertNotIn(('ingredient', 'QueueApproved-001'), rows_by_type_name)

    def test_admin_can_filter_queue_by_type(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/lookups/?type=ingredient')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        types = {r['type'] for r in response.data['results']}
        self.assertEqual(types, {'ingredient'})

    def test_invalid_status_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/lookups/?status=bogus')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_type_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/lookups/?type=religion')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_queue_row_includes_submitter_metadata(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/lookups/?type=ingredient')

        rows = response.data['results']
        row = next(r for r in rows if r['name'] == 'QueueSpice-001')
        self.assertEqual(row['submitted_by']['username'], 'user')
        self.assertIsNotNone(row['submitted_at'])
        self.assertIsNone(row['reviewed_by'])
        self.assertEqual(row['rejection_reason'], '')


class LookupModerationActionTests(APITestCase):
    """Admin approve / reject endpoints."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@example.com', username='admin', password='Pass123!',
        )
        self.user = User.objects.create_user(
            email='user@example.com', username='user', password='Pass123!',
        )
        self.ingredient = Ingredient.objects.create(
            name='ActionSpice-001', is_approved=False, submitted_by=self.user,
        )
        self.unit = Unit.objects.create(
            name='actionunit-001', is_approved=False, submitted_by=self.user,
        )
        self.diet = DietaryTag.objects.create(
            name='actiondiet-001', is_approved=False, submitted_by=self.user,
        )

    def test_non_admin_cannot_approve(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f'/api/moderation/lookups/ingredient/{self.ingredient.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ingredient.refresh_from_db()
        self.assertFalse(self.ingredient.is_approved)

    def test_non_admin_cannot_reject(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f'/api/moderation/lookups/ingredient/{self.ingredient.id}/reject/',
            {'reason': 'spam'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_approve_ingredient(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/lookups/ingredient/{self.ingredient.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ingredient.refresh_from_db()
        self.assertTrue(self.ingredient.is_approved)
        self.assertEqual(self.ingredient.reviewed_by, self.admin)
        self.assertIsNotNone(self.ingredient.reviewed_at)

        # Public listing now includes the approved ingredient.
        anon = self.client_class()
        public = anon.get('/api/ingredients/')
        self.assertIn('ActionSpice-001', [i['name'] for i in public.data])

    def test_admin_can_reject_ingredient_with_reason(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/lookups/ingredient/{self.ingredient.id}/reject/',
            {'reason': 'duplicate of existing tag'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ingredient.refresh_from_db()
        self.assertFalse(self.ingredient.is_approved)
        self.assertEqual(self.ingredient.reviewed_by, self.admin)
        self.assertIsNotNone(self.ingredient.reviewed_at)
        self.assertEqual(self.ingredient.rejection_reason, 'duplicate of existing tag')

        # Still hidden from public listing.
        anon = self.client_class()
        public = anon.get('/api/ingredients/')
        self.assertNotIn('ActionSpice-001', [i['name'] for i in public.data])

    def test_admin_can_approve_unit(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/lookups/unit/{self.unit.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.unit.refresh_from_db()
        self.assertTrue(self.unit.is_approved)

    def test_admin_can_approve_dietary_tag(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/lookups/dietary-tag/{self.diet.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.diet.refresh_from_db()
        self.assertTrue(self.diet.is_approved)

    def test_approve_clears_prior_rejection_reason(self):
        self.ingredient.rejection_reason = 'previously rejected'
        self.ingredient.save(update_fields=['rejection_reason'])

        self.client.force_authenticate(self.admin)
        self.client.post(
            f'/api/moderation/lookups/ingredient/{self.ingredient.id}/approve/'
        )
        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.rejection_reason, '')

    def test_invalid_type_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/lookups/event/{self.ingredient.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_id_returns_404(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            '/api/moderation/lookups/ingredient/999999/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rejected_then_approved_flow(self):
        """A rejected ingredient can later be approved; both transitions show
        up under the right queue filter."""
        self.client.force_authenticate(self.admin)

        # First reject.
        self.client.post(
            f'/api/moderation/lookups/ingredient/{self.ingredient.id}/reject/',
            {'reason': 'low quality'},
        )
        rejected = self.client.get(
            '/api/moderation/lookups/?status=rejected&type=ingredient'
        )
        rejected_ids = [r['id'] for r in rejected.data['results']]
        self.assertIn(self.ingredient.id, rejected_ids)

        # Then approve.
        self.client.post(
            f'/api/moderation/lookups/ingredient/{self.ingredient.id}/approve/'
        )
        approved = self.client.get(
            '/api/moderation/lookups/?status=approved&type=ingredient'
        )
        approved_ids = [r['id'] for r in approved.data['results']]
        self.assertIn(self.ingredient.id, approved_ids)
