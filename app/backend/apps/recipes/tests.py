from decimal import Decimal

from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import Recipe, Region, Ingredient, Unit, RecipeIngredient, EndangeredNote
from apps.stories.models import Story
from apps.common.ids import ULID_REGEX
from django.contrib.auth import get_user_model

User = get_user_model()

class PublicEndpointTest(APITestCase):
    """
    Verification tests for Issue #147: Public Endpoints.
    Ensures search and retrieval do not require an authorization token.
    """

    def setUp(self):
        self.region, _ = Region.objects.get_or_create(name="Mediterranean")
        self.user = User.objects.create_user(
            email="author_pub@example.com",
            username="author_pub",
            password="SecurePass123!"
        )
        self.recipe = Recipe.objects.create(
            title="Hummus",
            description="Traditional chickpea dip.",
            region=self.region,
            author=self.user,
            is_published=True
        )
        self.recipe_list_url = reverse('recipe-list')
        self.recipe_detail_url = reverse('recipe-detail', kwargs={'pk': self.recipe.pk})
        self.search_url = reverse('global_search')

    def test_recipe_list_is_public(self):
        response = self.client.get(self.recipe_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)
        self.assertTrue(any(r['title'] == "Hummus" for r in results))

    def test_recipe_detail_is_public(self):
        response = self.client.get(self.recipe_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Hummus")

    def test_search_is_public(self):
        response = self.client.get(self.search_url, {'q': 'Hummus'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recipes', response.data)
        self.assertEqual(response.data['recipes'][0]['title'], "Hummus")

    def test_recipe_list_story_count(self):
        """Verify story_count annotation works correctly."""
        # Link a published story to the recipe
        Story.objects.create(
            title="Hummus Story", body="Very tasty",
            author=self.user, is_published=True
        ).linked_recipes.add(self.recipe)
        
        response = self.client.get(self.recipe_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Find hummus in results (paginated)
        results = response.data.get('results', response.data)
        hummus = next(r for r in results if r['id'] == self.recipe.id)
        self.assertEqual(hummus['story_count'], 1)

    def test_creation_requires_auth(self):
        data = {
            "title": "New Recipe",
            "description": "Unauthenticated POST",
            "region": self.region.pk
        }
        response = self.client.post(self.recipe_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RecipeCreateAPITest(APITestCase):
    """Tests for POST /api/recipes/ — creation and validation (#175)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="chef@example.com", username="chef", password="StrongPass123!"
        )
        self.region, _ = Region.objects.get_or_create(name="Turkish")
        self.ingredient, _ = Ingredient.objects.get_or_create(name="Chickpeas", defaults={"is_approved": True})
        self.unit, _ = Unit.objects.get_or_create(name="grams", defaults={"is_approved": True})
        self.client.force_authenticate(user=self.user)
        self.url = reverse('recipe-list')

    def test_create_recipe_success(self):
        data = {
            "title": "Hummus",
            "description": "Creamy chickpea dip",
            "region": self.region.id,
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "200.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "Hummus")
        self.assertIsInstance(response.data['id'], int)
        self.assertRegex(response.data['public_id'], ULID_REGEX)
        self.assertEqual(response.data['author_username'], "chef")
        self.assertEqual(len(response.data['ingredients']), 1)

    def test_created_recipes_have_distinct_public_ids(self):
        data = {
            "title": "Hummus",
            "description": "Creamy chickpea dip",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "200.00", "unit": self.unit.id}
            ]
        }
        first = self.client.post(self.url, data, format='json')
        second_data = {**data, "title": "Second Hummus"}
        second = self.client.post(self.url, second_data, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(first.data['public_id'], second.data['public_id'])

    def test_create_recipe_missing_title(self):
        data = {
            "description": "No title",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "1.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_create_recipe_missing_description(self):
        data = {
            "title": "No Desc",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "1.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_create_recipe_no_ingredients_rejected(self):
        data = {"title": "Empty", "description": "No ingredients"}
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ingredients_write', response.data)

    def test_create_recipe_negative_amount_rejected(self):
        data = {
            "title": "Bad Amount",
            "description": "Negative",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "-5.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_recipe_zero_amount_rejected(self):
        data = {
            "title": "Zero",
            "description": "Zero amount",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "0.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_recipe_multiple_ingredients(self):
        flour, _ = Ingredient.objects.get_or_create(name="Flour", defaults={"is_approved": True})
        data = {
            "title": "Bread",
            "description": "Simple bread",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "100.00", "unit": self.unit.id},
                {"ingredient": flour.id, "amount": "250.00", "unit": self.unit.id},
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['ingredients']), 2)

    def test_created_recipe_is_not_published_by_default(self):
        data = {
            "title": "Draft",
            "description": "Should be unpublished",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "1.00", "unit": self.unit.id}
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_published'])


class RecipeEditAPITest(APITestCase):
    """Tests for PUT/PATCH /api/recipes/:id/ — editing (#175)."""

    def setUp(self):
        self.author = User.objects.create_user(
            email="author_edit@example.com", username="author_edit", password="StrongPass123!"
        )
        self.other = User.objects.create_user(
            email="other@example.com", username="other", password="StrongPass123!"
        )
        self.ingredient, _ = Ingredient.objects.get_or_create(name="Tomato", defaults={"is_approved": True})
        self.unit, _ = Unit.objects.get_or_create(name="pieces", defaults={"is_approved": True})
        self.recipe = Recipe.objects.create(
            title="Salad", description="Green salad", author=self.author
        )
        RecipeIngredient.objects.create(
            recipe=self.recipe, ingredient=self.ingredient, amount=3, unit=self.unit
        )

    def test_author_can_patch_title(self):
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.patch(url, {"title": "Caesar Salad"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Caesar Salad")

    def test_author_can_put_full_update(self):
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        data = {
            "title": "New Salad",
            "description": "Updated",
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "5.00", "unit": self.unit.id}
            ]
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ingredients'][0]['amount'], '5.00')

    def test_non_author_gets_403(self):
        self.client.force_authenticate(user=self.other)
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.patch(url, {"title": "Hijacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.patch(url, {"title": "Anonymous"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_edit_replaces_ingredients(self):
        self.client.force_authenticate(user=self.author)
        new_ing, _ = Ingredient.objects.get_or_create(name="Cucumber", defaults={"is_approved": True})
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        data = {
            "title": "Salad",
            "description": "Green salad",
            "ingredients_write": [
                {"ingredient": new_ing.id, "amount": "2.00", "unit": self.unit.id}
            ]
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['ingredients']), 1)
        self.assertEqual(response.data['ingredients'][0]['ingredient_name'], "Cucumber")


class RecipePublishAPITest(APITestCase):
    """Tests for publish/unpublish actions (#175)."""

    def setUp(self):
        self.author = User.objects.create_user(
            email="pub@example.com", username="publisher", password="StrongPass123!"
        )
        self.other = User.objects.create_user(
            email="rando@example.com", username="rando", password="StrongPass123!"
        )
        self.recipe = Recipe.objects.create(
            title="Draft Recipe", description="Unpublished", author=self.author
        )

    def test_author_can_publish(self):
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-publish', kwargs={'pk': self.recipe.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_published'])

    def test_author_can_unpublish(self):
        self.recipe.is_published = True
        self.recipe.save()
        self.client.force_authenticate(user=self.author)
        url = reverse('recipe-unpublish', kwargs={'pk': self.recipe.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_published'])

    def test_non_author_cannot_publish(self):
        self.client.force_authenticate(user=self.other)
        url = reverse('recipe-publish', kwargs={'pk': self.recipe.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_published_recipe_visible_in_detail(self):
        self.recipe.is_published = True
        self.recipe.save()
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_published'])

    def test_recipe_detail_accepts_public_id(self):
        self.recipe.is_published = True
        self.recipe.save()
        url = reverse('recipe-detail', kwargs={'pk': self.recipe.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.recipe.id)
        self.assertEqual(response.data['public_id'], self.recipe.public_id)


class RecipeHeritageFieldsAPITest(APITestCase):
    """Tests for Recipe.is_heritage and Recipe.heritage_notes (#585).

    These fields back the Cultural Passport stamp logic (#584, #587). The author
    opts a recipe in as heritage and explains why; downstream stamping reads both.
    """

    def setUp(self):
        self.author = User.objects.create_user(
            email="heritage_author@example.com",
            username="heritage_author",
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
        self.client.force_authenticate(user=self.author)

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

    def test_create_with_heritage_fields_round_trips(self):
        data = self._payload(
            is_heritage=True,
            heritage_notes="Cooked at every Eid since the 1940s in our family.",
        )
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_heritage'])
        self.assertEqual(
            response.data['heritage_notes'],
            "Cooked at every Eid since the 1940s in our family.",
        )
        recipe = Recipe.objects.get(pk=response.data['id'])
        self.assertTrue(recipe.is_heritage)
        self.assertEqual(
            recipe.heritage_notes,
            "Cooked at every Eid since the 1940s in our family.",
        )

    def test_create_defaults_when_fields_omitted(self):
        response = self.client.post(self.list_url, self._payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_heritage'])
        self.assertEqual(response.data['heritage_notes'], "")

    def test_patch_flips_is_heritage_and_edits_notes(self):
        create_resp = self.client.post(self.list_url, self._payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        recipe_id = create_resp.data['id']
        detail_url = reverse('recipe-detail', kwargs={'pk': recipe_id})
        patch_resp = self.client.patch(
            detail_url,
            {"is_heritage": True, "heritage_notes": "Reclassified as heritage."},
            format='json',
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(patch_resp.data['is_heritage'])
        self.assertEqual(patch_resp.data['heritage_notes'], "Reclassified as heritage.")

    def test_detail_get_surfaces_heritage_fields(self):
        recipe = Recipe.objects.create(
            title="Manti",
            description="Tiny dumplings in yoghurt sauce.",
            author=self.author,
            is_heritage=True,
            heritage_notes="Hand-folded every winter solstice.",
        )
        url = reverse('recipe-detail', kwargs={'pk': recipe.id})
        self.client.force_authenticate(user=None)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_heritage'])
        self.assertEqual(
            response.data['heritage_notes'],
            "Hand-folded every winter solstice.",
        )

    def test_list_get_surfaces_heritage_fields(self):
        Recipe.objects.create(
            title="Lokum",
            description="Turkish delight.",
            author=self.author,
            is_published=True,
            is_heritage=True,
            heritage_notes="Sold in our shop since 1923.",
        )
        self.client.force_authenticate(user=None)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        match = next(r for r in results if r['title'] == "Lokum")
        self.assertTrue(match['is_heritage'])
        self.assertEqual(match['heritage_notes'], "Sold in our shop since 1923.")

    def test_legacy_recipe_serializes_with_defaults(self):
        recipe = Recipe.objects.create(
            title="Plain Tea",
            description="No heritage opt-in.",
            author=self.author,
            is_published=True,
        )
        url = reverse('recipe-detail', kwargs={'pk': recipe.id})
        self.client.force_authenticate(user=None)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_heritage'])
        self.assertEqual(response.data['heritage_notes'], "")


class ZoomToRegionCoordsAPITest(APITestCase):
    """Tests for zoom-to-region coordinates (#662).

    Recipe gains nullable latitude/longitude; Region exposes its existing
    bbox_* bounds; GET /api/regions/<id>/recipes/ partitions a region's
    recipes into located vs unlocated for the zoom-to-region map (#464).
    """

    def setUp(self):
        self.author = User.objects.create_user(
            email="zoom_author@example.com",
            username="zoom_author",
            password="StrongPass123!",
        )
        self.region = Region.objects.create(
            name="Pontic Coast",
            is_approved=True,
            latitude=41.0,
            longitude=39.7,
            bbox_north=42.1,
            bbox_south=40.3,
            bbox_east=42.5,
            bbox_west=36.0,
        )
        self.located = Recipe.objects.create(
            title="Trabzon Sarma",
            description="Collard rolls.",
            region=self.region,
            author=self.author,
            is_published=True,
            latitude=Decimal("41.000000"),
            longitude=Decimal("39.716700"),
        )
        self.unlocated = Recipe.objects.create(
            title="Black Sea Anchovy Pilaf",
            description="Hamsi pilav.",
            region=self.region,
            author=self.author,
            is_published=True,
        )

    def test_recipe_detail_includes_null_coordinates(self):
        url = reverse('recipe-detail', kwargs={'pk': self.unlocated.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['latitude'])
        self.assertIsNone(response.data['longitude'])

    def test_recipe_detail_includes_set_coordinates(self):
        url = reverse('recipe-detail', kwargs={'pk': self.located.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data['latitude'])), Decimal("41.000000"))
        self.assertEqual(Decimal(str(response.data['longitude'])), Decimal("39.716700"))

    def test_recipe_region_list_includes_coordinates(self):
        response = self.client.get(reverse('recipe-list'), {'region': 'Pontic Coast'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        by_id = {r['id']: r for r in results}
        self.assertIn('latitude', by_id[self.located.id])
        self.assertIn('longitude', by_id[self.located.id])
        self.assertEqual(
            Decimal(str(by_id[self.located.id]['latitude'])), Decimal("41.000000")
        )
        self.assertIsNone(by_id[self.unlocated.id]['latitude'])
        self.assertIsNone(by_id[self.unlocated.id]['longitude'])

    def test_region_detail_includes_bbox(self):
        url = reverse('region-detail', kwargs={'pk': self.region.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('bbox_north', 'bbox_south', 'bbox_east', 'bbox_west', 'latitude', 'longitude'):
            self.assertIn(key, response.data)
        self.assertEqual(response.data['bbox_north'], 42.1)
        self.assertEqual(response.data['bbox_west'], 36.0)

    def test_region_recipes_endpoint_partitions(self):
        url = reverse('region-recipes', kwargs={'pk': self.region.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        located_ids = [r['id'] for r in response.data['located']]
        unlocated_ids = [r['id'] for r in response.data['unlocated']]
        self.assertEqual(located_ids, [self.located.id])
        self.assertEqual(unlocated_ids, [self.unlocated.id])

        located_entry = response.data['located'][0]
        self.assertEqual(located_entry['title'], "Trabzon Sarma")
        self.assertEqual(located_entry['author_username'], "zoom_author")
        self.assertEqual(Decimal(str(located_entry['latitude'])), Decimal("41.000000"))
        self.assertEqual(Decimal(str(located_entry['longitude'])), Decimal("39.716700"))

        unlocated_entry = response.data['unlocated'][0]
        self.assertEqual(unlocated_entry['title'], "Black Sea Anchovy Pilaf")
        self.assertEqual(unlocated_entry['author_username'], "zoom_author")
        self.assertNotIn('latitude', unlocated_entry)
        self.assertNotIn('longitude', unlocated_entry)

    def test_region_recipes_endpoint_partial_coordinates_are_unlocated(self):
        half = Recipe.objects.create(
            title="Half Located",
            description="Only latitude set.",
            region=self.region,
            author=self.author,
            latitude=Decimal("41.000000"),
        )
        url = reverse('region-recipes', kwargs={'pk': self.region.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(half.id, [r['id'] for r in response.data['unlocated']])
        self.assertNotIn(half.id, [r['id'] for r in response.data['located']])

    def test_region_recipes_endpoint_empty_region(self):
        empty = Region.objects.create(name="Empty Land", is_approved=True)
        url = reverse('region-recipes', kwargs={'pk': empty.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'located': [], 'unlocated': []})

    def test_region_recipes_endpoint_unknown_region_404(self):
        url = reverse('region-recipes', kwargs={'pk': 999999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_recipe_with_coordinates_round_trips(self):
        self.client.force_authenticate(user=self.author)
        ingredient, _ = Ingredient.objects.get_or_create(
            name="Cornmeal", defaults={"is_approved": True}
        )
        data = {
            "title": "Muhlama",
            "description": "Cheese fondue from the highlands.",
            "region": self.region.id,
            "latitude": "40.916700",
            "longitude": "39.083300",
            "ingredients_write": [
                {"ingredient": ingredient.id, "amount": "1.00"}
            ],
        }
        response = self.client.post(reverse('recipe-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        recipe = Recipe.objects.get(pk=response.data['id'])
        self.assertEqual(recipe.latitude, Decimal("40.916700"))
        self.assertEqual(recipe.longitude, Decimal("39.083300"))


class EndangeredHeritageTagsAPITest(APITestCase):
    """Tests for heritage_status and EndangeredNote (#524, parent #507).

    Backs the amber heritage badge and the filtered listing on web (#520) and
    mobile (#526).
    """

    def setUp(self):
        self.author = User.objects.create_user(
            email="endangered_author@example.com",
            username="endangered_author",
            password="StrongPass123!",
        )
        self.region, _ = Region.objects.get_or_create(name="Cappadocia")
        self.ingredient, _ = Ingredient.objects.get_or_create(
            name="Einkorn", defaults={"is_approved": True}
        )
        self.unit, _ = Unit.objects.get_or_create(
            name="handfuls", defaults={"is_approved": True}
        )
        self.list_url = reverse('recipe-list')
        self.client.force_authenticate(user=self.author)

    def _payload(self, **overrides):
        data = {
            "title": "Testi Kebabi",
            "description": "Slow-cooked stew sealed in a clay pot.",
            "region": self.region.id,
            "ingredients_write": [
                {"ingredient": self.ingredient.id, "amount": "3.00", "unit": self.unit.id}
            ],
        }
        data.update(overrides)
        return data

    def test_recipe_heritage_status_defaults_to_none(self):
        recipe = Recipe.objects.create(
            title="Plain Stew", description="Nothing special.", author=self.author,
        )
        self.assertEqual(recipe.heritage_status, 'none')
        url = reverse('recipe-detail', kwargs={'pk': recipe.id})
        self.client.force_authenticate(user=None)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['heritage_status'], 'none')

    def test_create_recipe_with_heritage_status_round_trips(self):
        response = self.client.post(
            self.list_url, self._payload(heritage_status='endangered'), format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['heritage_status'], 'endangered')
        recipe = Recipe.objects.get(pk=response.data['id'])
        self.assertEqual(recipe.heritage_status, 'endangered')

    def test_patch_recipe_heritage_status(self):
        create_resp = self.client.post(self.list_url, self._payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        recipe_id = create_resp.data['id']
        self.assertEqual(create_resp.data['heritage_status'], 'none')
        detail_url = reverse('recipe-detail', kwargs={'pk': recipe_id})
        patch_resp = self.client.patch(detail_url, {"heritage_status": "revived"}, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['heritage_status'], 'revived')
        self.assertEqual(Recipe.objects.get(pk=recipe_id).heritage_status, 'revived')

    def test_filter_recipes_by_heritage_status(self):
        endangered = Recipe.objects.create(
            title="Endangered Dish", description="At risk.", author=self.author,
            is_published=True, heritage_status='endangered',
        )
        Recipe.objects.create(
            title="Ordinary Dish", description="Common.", author=self.author,
            is_published=True, heritage_status='none',
        )
        Recipe.objects.create(
            title="Revived Dish", description="Brought back.", author=self.author,
            is_published=True, heritage_status='revived',
        )
        self.client.force_authenticate(user=None)
        response = self.client.get(self.list_url, {'heritage_status': 'endangered'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        titles = {r['title'] for r in results}
        self.assertIn("Endangered Dish", titles)
        self.assertNotIn("Ordinary Dish", titles)
        self.assertNotIn("Revived Dish", titles)
        self.assertTrue(all(r['heritage_status'] == 'endangered' for r in results))
        self.assertTrue(any(r['id'] == endangered.id for r in results))

    def test_ingredient_heritage_status_default_and_filter(self):
        plain = Ingredient.objects.create(name="Common Salt", is_approved=True)
        self.assertEqual(plain.heritage_status, 'none')
        rare = Ingredient.objects.create(
            name="Mahaleb Cherry", is_approved=True, heritage_status='endangered',
        )
        list_url = reverse('ingredient-list')
        self.client.force_authenticate(user=None)
        response = self.client.get(list_url, {'heritage_status': 'endangered'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        names = {r['name'] for r in results}
        self.assertIn("Mahaleb Cherry", names)
        self.assertNotIn("Common Salt", names)
        self.assertTrue(all(r['heritage_status'] == 'endangered' for r in results))
        self.assertTrue(any(r['id'] == rare.id for r in results))

    def test_endangered_note_appears_in_recipe_detail(self):
        recipe = Recipe.objects.create(
            title="Topik", description="Armenian chickpea appetizer.", author=self.author,
            is_published=True, heritage_status='endangered',
        )
        EndangeredNote.objects.create(
            recipe=recipe,
            text="Only a handful of cooks still prepare it traditionally.",
            source_url="https://example.org/topik",
        )
        url = reverse('recipe-detail', kwargs={'pk': recipe.id})
        self.client.force_authenticate(user=None)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['endangered_notes']), 1)
        note = response.data['endangered_notes'][0]
        self.assertEqual(note['text'], "Only a handful of cooks still prepare it traditionally.")
        self.assertEqual(note['source_url'], "https://example.org/topik")
        self.assertEqual(note['recipe'], recipe.id)

    def test_recipe_detail_has_empty_notes_by_default(self):
        recipe = Recipe.objects.create(
            title="No Notes", description="Nothing attached.", author=self.author,
            is_published=True,
        )
        url = reverse('recipe-detail', kwargs={'pk': recipe.id})
        self.client.force_authenticate(user=None)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['endangered_notes'], [])
