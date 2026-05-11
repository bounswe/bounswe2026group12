from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from .models import Recipe, RecipeCulturalContext, Region, Ingredient, Unit

User = get_user_model()

class RecipeCulturalContextAPITest(APITestCase):
    """Tests for RecipeCulturalContext fields (#509)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="storyteller@example.com",
            username="storyteller",
            password="StrongPass123!",
        )
        self.region, _ = Region.objects.get_or_create(name="Anatolian")
        self.ingredient, _ = Ingredient.objects.get_or_create(
            name="Bulgur", defaults={"is_approved": True}
        )
        self.unit, _ = Unit.objects.get_or_create(
            name="cups", defaults={"is_approved": True}
        )
        self.list_url = reverse('recipe-list')
        self.client.force_authenticate(user=self.user)

    def _payload(self, **overrides):
        data = {
            "title": "Grandmother's Pilaf",
            "description": "Bulgur pilaf passed down four generations.",
            "region": self.region.id,
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "2.00", "unit": self.unit.id}
            ],
        }
        data.update(overrides)
        return data

    def test_create_with_cultural_context_success(self):
        cultural_data = {
            "identity_note": "This dish is how I know I'm from Trabzon",
            "memory_note": "The smell of grape leaves takes me back to my grandfather's kitchen",
            "migration_note": "My family brought this from Crete in the 1923 population exchange",
            "ritual_note": "Only for Hıdırellez (May 6). Marks the start of summer.",
            "commensality_note": "Everyone on the floor, eldest starts, same tray",
            "terroir_note": "Grape leaves must be from the Black Sea coast — humidity makes them tender",
            "craft_note": "Rolling thin enough takes years. My mother says you can't learn from a video."
        }
        data = self._payload(cultural_context=cultural_data)
        response = self.client.post(self.list_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('cultural_context', response.data)
        self.assertEqual(response.data['cultural_context']['identity_note'], cultural_data['identity_note'])
        
        recipe = Recipe.objects.get(pk=response.data['id'])
        self.assertTrue(hasattr(recipe, 'cultural_context'))
        self.assertEqual(recipe.cultural_context.identity_note, cultural_data['identity_note'])

    def test_create_with_partial_cultural_context(self):
        cultural_data = {
            "identity_note": "Just identity note provided",
        }
        data = self._payload(cultural_context=cultural_data)
        response = self.client.post(self.list_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['cultural_context']['identity_note'], "Just identity note provided")
        self.assertEqual(response.data['cultural_context']['memory_note'], "")

    def test_update_cultural_context(self):
        # First create a recipe
        create_data = self._payload(cultural_context={"identity_note": "Initial"})
        create_resp = self.client.post(self.list_url, create_data, format='json')
        recipe_id = create_resp.data['id']
        detail_url = reverse('recipe-detail', kwargs={'pk': recipe_id})
        
        # Now update it
        update_data = {"cultural_context": {"identity_note": "Updated", "memory_note": "Added memory"}}
        response = self.client.patch(detail_url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['cultural_context']['identity_note'], "Updated")
        self.assertEqual(response.data['cultural_context']['memory_note'], "Added memory")
        
        # Verify DB
        recipe = Recipe.objects.get(pk=recipe_id)
        self.assertEqual(recipe.cultural_context.identity_note, "Updated")

    def test_update_cultural_context_with_null(self):
        """Test that sending cultural_context=null doesn't crash but might not delete (standard nested serializer behavior)."""
        # Actually, in our update() implementation, if cultural_context_data is not None (even if empty dict or null), we update_or_create.
        # If it's None in the validated_data (meaning key omitted), we do nothing.
        
        create_data = self._payload(cultural_context={"identity_note": "Initial"})
        create_resp = self.client.post(self.list_url, create_data, format='json')
        recipe_id = create_resp.data['id']
        detail_url = reverse('recipe-detail', kwargs={'pk': recipe_id})
        
        # Patch without the key should leave it alone
        self.client.patch(detail_url, {"title": "New Title"}, format='json')
        recipe = Recipe.objects.get(pk=recipe_id)
        self.assertEqual(recipe.cultural_context.identity_note, "Initial")

    def test_cascade_delete(self):
        create_data = self._payload(cultural_context={"identity_note": "Initial"})
        create_resp = self.client.post(self.list_url, create_data, format='json')
        recipe_id = create_resp.data['id']
        context_id = Recipe.objects.get(pk=recipe_id).cultural_context.id
        
        Recipe.objects.get(pk=recipe_id).delete()
        self.assertFalse(RecipeCulturalContext.objects.filter(id=context_id).exists())

    def test_detail_get_surfaces_cultural_context(self):
        recipe = Recipe.objects.create(title="Test", author=self.user)
        RecipeCulturalContext.objects.create(recipe=recipe, identity_note="Secret identity")
        
        url = reverse('recipe-detail', kwargs={'pk': recipe.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('cultural_context', response.data)
        self.assertEqual(response.data['cultural_context']['identity_note'], "Secret identity")

    def test_recipe_without_context_returns_null(self):
        recipe = Recipe.objects.create(title="No Context", author=self.user)
        url = reverse('recipe-detail', kwargs={'pk': recipe.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['cultural_context'])
