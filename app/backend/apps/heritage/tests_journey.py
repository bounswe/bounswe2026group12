from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import HeritageGroup, HeritageJourneyStep


User = get_user_model()


def _make_admin(username='journey_admin'):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password='pw12345!',
        is_staff=True,
    )


def _make_user(username='journey_user'):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password='pw12345!',
    )


def _make_group(name='Kofte'):
    return HeritageGroup.objects.create(
        name=name,
        description='Meatballs across the silk road.',
    )


class HeritageJourneyStepModelTests(APITestCase):
    def test_unique_together_on_group_and_order(self):
        group = _make_group()
        HeritageJourneyStep.objects.create(
            heritage_group=group, order=1, location='Central Asia', story='Origin.',
        )
        with self.assertRaises(IntegrityError):
            HeritageJourneyStep.objects.create(
                heritage_group=group, order=1, location='Anatolia', story='Spread.',
            )

    def test_same_order_allowed_across_different_groups(self):
        group_a = _make_group(name='Kofte')
        group_b = _make_group(name='Sarma / Dolma')
        HeritageJourneyStep.objects.create(
            heritage_group=group_a, order=1, location='Central Asia', story='A1',
        )
        # Should not raise: order=1 only collides within the same group.
        HeritageJourneyStep.objects.create(
            heritage_group=group_b, order=1, location='Anatolia', story='B1',
        )
        self.assertEqual(HeritageJourneyStep.objects.count(), 2)

    def test_default_ordering_by_group_then_order(self):
        group = _make_group()
        HeritageJourneyStep.objects.create(
            heritage_group=group, order=3, location='Balkans', story='S3',
        )
        HeritageJourneyStep.objects.create(
            heritage_group=group, order=1, location='Central Asia', story='S1',
        )
        HeritageJourneyStep.objects.create(
            heritage_group=group, order=2, location='Anatolia', story='S2',
        )
        orders = list(
            HeritageJourneyStep.objects.filter(heritage_group=group).values_list('order', flat=True)
        )
        self.assertEqual(orders, [1, 2, 3])


class HeritageJourneyStepAPITests(APITestCase):
    def setUp(self):
        self.admin = _make_admin()
        self.user = _make_user()
        self.group = _make_group()
        self.other_group = _make_group(name='Sarma / Dolma')
        self.step1 = HeritageJourneyStep.objects.create(
            heritage_group=self.group, order=2, location='Anatolia', story='Spread.',
            era='Ottoman',
        )
        self.step2 = HeritageJourneyStep.objects.create(
            heritage_group=self.group, order=1, location='Central Asia', story='Origin.',
            era='Pre-Islamic',
        )
        self.other_step = HeritageJourneyStep.objects.create(
            heritage_group=self.other_group, order=1, location='Aegean', story='Leaves.',
        )

    def test_list_returns_steps_sorted_by_group_and_order(self):
        url = reverse('heritage-journey-step-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        # Within the Kofte group the step at order=1 must precede order=2.
        kofte_steps = [r for r in results if r['heritage_group'] == self.group.id]
        self.assertEqual([s['order'] for s in kofte_steps], [1, 2])

    def test_list_filter_by_heritage_group(self):
        url = reverse('heritage-journey-step-list')
        response = self.client.get(url, {'heritage_group': self.group.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = {r['id'] for r in results}
        self.assertIn(self.step1.id, ids)
        self.assertIn(self.step2.id, ids)
        self.assertNotIn(self.other_step.id, ids)

    def test_retrieve_step(self):
        url = reverse('heritage-journey-step-detail', args=[self.step1.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['location'], 'Anatolia')
        self.assertEqual(response.data['era'], 'Ottoman')
        self.assertEqual(response.data['heritage_group'], self.group.id)

    def test_anonymous_cannot_create(self):
        url = reverse('heritage-journey-step-list')
        payload = {
            'heritage_group': self.group.id, 'order': 9,
            'location': 'Diaspora', 'story': 'Modern day.',
        }
        response = self.client.post(url, payload, format='json')
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_authenticated_non_staff_cannot_create(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('heritage-journey-step-list')
        payload = {
            'heritage_group': self.group.id, 'order': 9,
            'location': 'Diaspora', 'story': 'Modern day.',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('heritage-journey-step-list')
        payload = {
            'heritage_group': self.group.id, 'order': 9,
            'location': 'Diaspora', 'story': 'Modern day.', 'era': 'Modern',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            HeritageJourneyStep.objects.filter(
                heritage_group=self.group, order=9, location='Diaspora',
            ).exists()
        )

    def test_admin_can_update(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('heritage-journey-step-detail', args=[self.step1.id])
        response = self.client.patch(url, {'era': 'Late Ottoman'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.step1.refresh_from_db()
        self.assertEqual(self.step1.era, 'Late Ottoman')

    def test_admin_can_delete(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('heritage-journey-step-detail', args=[self.step1.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(HeritageJourneyStep.objects.filter(id=self.step1.id).exists())


class HeritageGroupDetailNestsJourneyStepsTests(APITestCase):
    def test_detail_nests_journey_steps_ordered(self):
        group = _make_group()
        HeritageJourneyStep.objects.create(
            heritage_group=group, order=3, location='Balkans', story='S3',
        )
        HeritageJourneyStep.objects.create(
            heritage_group=group, order=1, location='Central Asia', story='S1',
        )
        HeritageJourneyStep.objects.create(
            heritage_group=group, order=2, location='Anatolia', story='S2',
        )

        url = reverse('heritage-group-detail', args=[group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('journey_steps', response.data)
        steps = response.data['journey_steps']
        self.assertEqual([s['order'] for s in steps], [1, 2, 3])
        self.assertEqual([s['location'] for s in steps], ['Central Asia', 'Anatolia', 'Balkans'])

    def test_detail_journey_steps_empty_when_none(self):
        group = _make_group(name='Empty')
        url = reverse('heritage-group-detail', args=[group.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['journey_steps'], [])
