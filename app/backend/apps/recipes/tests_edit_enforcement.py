"""Edit-enforcement regression tests for recipes app (#360, M6-09).

Audit coverage for requirement 4.4.1 ("All edit endpoints enforce
ownership independent of UI state"). Each test asserts that a non-author
or non-admin caller is denied with 4xx and that the underlying row is
unchanged. Pattern follows TC_API_REC_002 in
``apps.recipes.tests_permissions::test_non_author_cannot_edit_recipe``.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.recipes.models import (
    DietaryTag, EventTag, Ingredient, Recipe, Region, Religion, Unit,
)

User = get_user_model()


class RecipePublishUnpublishEnforcementTests(APITestCase):
    """Non-author cannot toggle publish state via @action endpoints."""

    def setUp(self):
        self.author = User.objects.create_user(
            email='author@example.com', username='author-pub',
            password='pass12345',
        )
        self.other = User.objects.create_user(
            email='other@example.com', username='other-pub',
            password='pass12345',
        )
        self.recipe = Recipe.objects.create(
            title='Author Recipe', description='Desc', author=self.author,
            is_published=False,
        )

    def test_non_author_cannot_publish_recipe(self):
        """Audit coverage: non-author cannot POST /recipes/<id>/publish/."""
        self.client.force_authenticate(user=self.other)
        response = self.client.post(f'/api/recipes/{self.recipe.id}/publish/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.recipe.refresh_from_db()
        self.assertFalse(self.recipe.is_published)

    def test_non_author_cannot_unpublish_recipe(self):
        """Audit coverage: non-author cannot POST /recipes/<id>/unpublish/."""
        self.recipe.is_published = True
        self.recipe.save(update_fields=['is_published'])

        self.client.force_authenticate(user=self.other)
        response = self.client.post(f'/api/recipes/{self.recipe.id}/unpublish/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.recipe.refresh_from_db()
        self.assertTrue(self.recipe.is_published)


class ModeratedLookupAdminGateTests(APITestCase):
    """Non-admin cannot PATCH or DELETE Ingredient/Unit/DietaryTag rows.

    These viewsets share ``ModeratedLookupViewSet.get_permissions``: any
    action outside list/retrieve/create demands ``IsAdminUser``. Existing
    coverage ticks Ingredient PATCH; this class extends to DELETE and to
    sibling Unit / DietaryTag where coverage was missing.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email='lookup-user@example.com', username='lookup-user',
            password='pass12345',
        )
        self.ingredient = Ingredient.objects.create(
            name='AuditIngredient', is_approved=True,
        )
        self.unit = Unit.objects.create(name='AuditUnit', is_approved=True)
        self.dietary_tag = DietaryTag.objects.create(
            name='AuditDiet', is_approved=True,
        )

    def test_non_admin_cannot_delete_ingredient(self):
        """Audit coverage: non-admin DELETE /api/ingredients/<id>/ → 403, row remains."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/ingredients/{self.ingredient.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Ingredient.objects.filter(pk=self.ingredient.pk).exists())

    def test_non_admin_cannot_patch_unit(self):
        """Audit coverage: non-admin PATCH /api/units/<id>/ → 403, name unchanged."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/units/{self.unit.id}/', {'name': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.unit.refresh_from_db()
        self.assertEqual(self.unit.name, 'AuditUnit')

    def test_non_admin_cannot_delete_unit(self):
        """Audit coverage: non-admin DELETE /api/units/<id>/ → 403, row remains."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/units/{self.unit.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Unit.objects.filter(pk=self.unit.pk).exists())

    def test_non_admin_cannot_patch_dietary_tag(self):
        """Audit coverage: non-admin PATCH /api/dietary-tags/<id>/ → 403, name unchanged."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/dietary-tags/{self.dietary_tag.id}/',
            {'name': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.dietary_tag.refresh_from_db()
        self.assertEqual(self.dietary_tag.name, 'AuditDiet')

    def test_non_admin_cannot_delete_dietary_tag(self):
        """Audit coverage: non-admin DELETE /api/dietary-tags/<id>/ → 403, row remains."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/dietary-tags/{self.dietary_tag.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(DietaryTag.objects.filter(pk=self.dietary_tag.pk).exists())


class CulturalTagAdminGateTests(APITestCase):
    """Non-admin cannot PATCH or DELETE Region / EventTag / Religion rows.

    These viewsets layer ``CulturalTagSubmissionMixin`` (which only
    overrides ``create``) on top of ``ModeratedLookupViewSet``, so the
    update / destroy actions still hit the ``IsAdminUser`` branch. The
    submitter-self-approve test guards against a hypothetical regression
    where the submitter could PATCH ``is_approved=True`` on their own
    pending row.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email='ct-user@example.com', username='ct-user',
            password='pass12345',
        )
        self.region = Region.objects.create(
            name='AuditRegion', is_approved=True,
        )
        self.pending_region = Region.objects.create(
            name='AuditPendingRegion', is_approved=False,
            submitted_by=self.user,
        )
        self.event_tag = EventTag.objects.create(
            name='AuditEvent', is_approved=True,
        )
        self.religion = Religion.objects.create(
            name='AuditReligion', is_approved=True,
        )

    def test_non_admin_cannot_patch_region(self):
        """Audit coverage: non-admin PATCH /api/regions/<id>/ → 403, name unchanged."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/regions/{self.region.id}/',
            {'name': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.region.refresh_from_db()
        self.assertEqual(self.region.name, 'AuditRegion')

    def test_non_admin_cannot_delete_region(self):
        """Audit coverage: non-admin DELETE /api/regions/<id>/ → 403, row remains."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/regions/{self.region.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Region.objects.filter(pk=self.region.pk).exists())

    def test_region_submitter_cannot_self_approve(self):
        """Audit coverage: the submitter of a pending Region cannot PATCH
        ``is_approved=True`` on their own row. Defense in depth: the
        admin gate on update should block this even though the create
        path forces ``is_approved=False``.
        """
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/regions/{self.pending_region.id}/',
            {'is_approved': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.pending_region.refresh_from_db()
        self.assertFalse(self.pending_region.is_approved)

    def test_non_admin_cannot_patch_event_tag(self):
        """Audit coverage: non-admin PATCH /api/event-tags/<id>/ → 403, name unchanged."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/event-tags/{self.event_tag.id}/',
            {'name': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.event_tag.refresh_from_db()
        self.assertEqual(self.event_tag.name, 'AuditEvent')

    def test_non_admin_cannot_delete_event_tag(self):
        """Audit coverage: non-admin DELETE /api/event-tags/<id>/ → 403, row remains."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/event-tags/{self.event_tag.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(EventTag.objects.filter(pk=self.event_tag.pk).exists())

    def test_non_admin_cannot_patch_religion(self):
        """Audit coverage: non-admin PATCH /api/religions/<id>/ → 403, name unchanged."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/religions/{self.religion.id}/',
            {'name': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.religion.refresh_from_db()
        self.assertEqual(self.religion.name, 'AuditReligion')

    def test_non_admin_cannot_delete_religion(self):
        """Audit coverage: non-admin DELETE /api/religions/<id>/ → 403, row remains."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/religions/{self.religion.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Religion.objects.filter(pk=self.religion.pk).exists())
