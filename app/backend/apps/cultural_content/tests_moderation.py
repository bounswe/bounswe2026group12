"""Tests for cultural tag moderation queue (#391, M5-25).

Covers the user submission flow (with audit fields and dedup), the admin
queue listing, and the approve/reject endpoints.
"""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import EventTag, Region, Religion


User = get_user_model()


class CulturalTagSubmissionFlowTests(APITestCase):
    """User submission lands as is_approved=False with audit metadata
    populated, and dedup short-circuits return 409 / 200."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='submitter@example.com',
            username='submitter',
            password='Pass123!',
        )

    def test_anonymous_user_can_list_approved_event_tags(self):
        EventTag.objects.create(name='ApprovedFestival', is_approved=True)
        EventTag.objects.create(name='PendingFestival', is_approved=False)

        response = self.client.get('/api/event-tags/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [t['name'] for t in response.data]
        self.assertIn('ApprovedFestival', names)
        self.assertNotIn('PendingFestival', names)

    def test_authenticated_user_event_submission_lands_pending_with_audit(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            '/api/event-tags/',
            {'name': '  Harvest Festival  '},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Harvest Festival')
        self.assertFalse(response.data['is_approved'])

        tag = EventTag.objects.get(name='Harvest Festival')
        self.assertFalse(tag.is_approved)
        self.assertEqual(tag.submitted_by, self.user)
        self.assertIsNotNone(tag.submitted_at)
        self.assertIsNone(tag.reviewed_by)

        # Hidden from public list until approved.
        anon_response = self.client.get('/api/event-tags/')
        self.assertNotIn(
            'Harvest Festival',
            [t['name'] for t in anon_response.data],
        )

    def test_event_submission_dedup_returns_409_for_approved_match(self):
        EventTag.objects.create(name='QingMing', is_approved=True)
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/event-tags/', {'name': ' qingming '})

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data['name'], 'QingMing')
        # No duplicate row created.
        self.assertEqual(EventTag.objects.filter(name__iexact='qingming').count(), 1)

    def test_event_submission_dedup_returns_200_queued_for_pending_match(self):
        EventTag.objects.create(name='HoliFest42', is_approved=False)
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/event-tags/', {'name': 'holifest42'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('queued'))
        self.assertEqual(response.data['name'], 'HoliFest42')
        self.assertEqual(EventTag.objects.filter(name__iexact='holifest42').count(), 1)

    def test_anonymous_user_cannot_submit_event_tag(self):
        response = self.client.post('/api/event-tags/', {'name': 'Sneaky'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_event_submission_rejects_blank_name(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/event-tags/', {'name': '   '})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authenticated_user_can_submit_region(self):
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/regions/', {'name': 'Lower Anatolia'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_approved'])
        region = Region.objects.get(name='Lower Anatolia')
        self.assertEqual(region.submitted_by, self.user)
        self.assertFalse(region.is_approved)

    def test_region_user_submission_does_not_set_geo_metadata(self):
        """Geographic metadata stays admin-only on user submission."""
        self.client.force_authenticate(self.user)
        response = self.client.post(
            '/api/regions/',
            {
                'name': 'Mock Region',
                'latitude': 41.0,
                'longitude': 29.0,
                'is_approved': True,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        region = Region.objects.get(name='Mock Region')
        self.assertIsNone(region.latitude)
        self.assertIsNone(region.longitude)
        self.assertFalse(region.is_approved)

    def test_authenticated_user_can_submit_religion(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/religions/', {'name': 'Zoroastrianism'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_approved'])
        rel = Religion.objects.get(name='Zoroastrianism')
        self.assertEqual(rel.submitted_by, self.user)


class CulturalTagModerationQueueTests(APITestCase):
    """Admin-only queue listing across cultural tag types."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(
            email='admin@example.com', username='admin', password='Pass123!',
        )
        cls.user = User.objects.create_user(
            email='user@example.com', username='user', password='Pass123!',
        )

        cls.pending_event = EventTag.objects.create(
            name='HarvestFest', is_approved=False, submitted_by=cls.user,
        )
        cls.pending_region = Region.objects.create(
            name='Mock Region', is_approved=False, submitted_by=cls.user,
        )
        cls.pending_religion = Religion.objects.create(
            name='Pastafarianism', is_approved=False, submitted_by=cls.user,
        )
        EventTag.objects.create(name='ApprovedEvent', is_approved=True)

    def test_non_admin_authenticated_user_cannot_access_queue(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/moderation/cultural-tags/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_cannot_access_queue(self):
        response = self.client.get('/api/moderation/cultural-tags/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_list_pending_across_types(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/cultural-tags/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [(r['type'], r['name']) for r in response.data['results']]
        self.assertIn(('event', 'HarvestFest'), names)
        self.assertIn(('region', 'Mock Region'), names)
        self.assertIn(('religion', 'Pastafarianism'), names)
        # Approved entries are excluded from the default pending view.
        self.assertNotIn(('event', 'ApprovedEvent'), names)

    def test_admin_can_filter_queue_by_type(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/cultural-tags/?type=event')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        types_in_response = {r['type'] for r in response.data['results']}
        self.assertEqual(types_in_response, {'event'})

    def test_invalid_status_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/cultural-tags/?status=bogus')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_type_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/moderation/cultural-tags/?type=ingredient')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CulturalTagModerationActionTests(APITestCase):
    """Admin approve / reject endpoints."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@example.com', username='admin', password='Pass123!',
        )
        self.user = User.objects.create_user(
            email='user@example.com', username='user', password='Pass123!',
        )
        self.event = EventTag.objects.create(
            name='Pending Event', is_approved=False, submitted_by=self.user,
        )
        self.region = Region.objects.create(
            name='Pending Region', is_approved=False, submitted_by=self.user,
        )

    def test_non_admin_cannot_approve(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f'/api/moderation/cultural-tags/event/{self.event.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.event.refresh_from_db()
        self.assertFalse(self.event.is_approved)

    def test_non_admin_cannot_reject(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f'/api/moderation/cultural-tags/event/{self.event.id}/reject/',
            {'reason': 'spam'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_approve_event_tag(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/cultural-tags/event/{self.event.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.event.refresh_from_db()
        self.assertTrue(self.event.is_approved)
        self.assertEqual(self.event.reviewed_by, self.admin)
        self.assertIsNotNone(self.event.reviewed_at)

        # Approved tag becomes visible publicly.
        anon = self.client.get('/api/event-tags/')
        self.client.force_authenticate(None)  # ensure logout if needed
        self.assertIn(
            'Pending Event',
            [t['name'] for t in anon.data],
        )

    def test_admin_can_reject_with_reason(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/cultural-tags/event/{self.event.id}/reject/',
            {'reason': 'duplicate of existing tag'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.event.refresh_from_db()
        self.assertFalse(self.event.is_approved)
        self.assertEqual(self.event.reviewed_by, self.admin)
        self.assertIsNotNone(self.event.reviewed_at)
        self.assertEqual(self.event.rejection_reason, 'duplicate of existing tag')

        # Still hidden from public listing.
        anon = self.client.get('/api/event-tags/')
        self.assertNotIn(
            'Pending Event',
            [t['name'] for t in anon.data],
        )

    def test_admin_can_approve_region(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/cultural-tags/region/{self.region.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.region.refresh_from_db()
        self.assertTrue(self.region.is_approved)

    def test_approve_clears_prior_rejection_reason(self):
        self.event.rejection_reason = 'previously rejected'
        self.event.save(update_fields=['rejection_reason'])

        self.client.force_authenticate(self.admin)
        self.client.post(
            f'/api/moderation/cultural-tags/event/{self.event.id}/approve/'
        )
        self.event.refresh_from_db()
        self.assertEqual(self.event.rejection_reason, '')

    def test_invalid_type_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/moderation/cultural-tags/diet/{self.event.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_id_returns_404(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            '/api/moderation/cultural-tags/event/99999/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rejected_then_approved_flow(self):
        """A rejected tag can later be approved; both status transitions show
        up under the right queue filter."""
        self.client.force_authenticate(self.admin)

        # First reject.
        self.client.post(
            f'/api/moderation/cultural-tags/event/{self.event.id}/reject/',
            {'reason': 'low quality'},
        )

        rejected_resp = self.client.get(
            '/api/moderation/cultural-tags/?status=rejected&type=event'
        )
        rejected_ids = [r['id'] for r in rejected_resp.data['results']]
        self.assertIn(self.event.id, rejected_ids)

        # Then approve.
        self.client.post(
            f'/api/moderation/cultural-tags/event/{self.event.id}/approve/'
        )
        approved_resp = self.client.get(
            '/api/moderation/cultural-tags/?status=approved&type=event'
        )
        approved_ids = [r['id'] for r in approved_resp.data['results']]
        self.assertIn(self.event.id, approved_ids)
