import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.contrib.auth import get_user_model
from PIL import Image

from apps.recipes.models import (
    Recipe, RecipeIngredient, Region, Ingredient, Unit,
    DietaryTag, EventTag, Religion, Rating,
)
from apps.stories.models import Story, StoryRecipeLink
from apps.cultural_content.models import CulturalContent

User = get_user_model()


MINIMAL_FIXTURE = {
    "users": [
        {
            "username": "testuser1",
            "email": "test1@example.com",
            "password": "StrongPassword123!",
            "bio": "Test user one.",
            "region": "Black Sea",
            "preferred_language": "en",
            "cultural_interests": [],
            "regional_ties": [],
            "religious_preferences": [],
            "event_interests": []
        },
        {
            "username": "testuser2",
            "email": "test2@example.com",
            "password": "StrongPassword123!",
            "bio": "Test user two.",
            "region": "Aegean",
            "preferred_language": "en",
            "cultural_interests": [],
            "regional_ties": [],
            "religious_preferences": [],
            "event_interests": []
        }
    ],
    "recipes": [
        {
            "title": "Test Recipe One",
            "description": "A test recipe with tags.",
            "author": "testuser1",
            "region": "Black Sea",
            "is_published": True,
            "dietary_tags": ["Halal"],
            "event_tags": ["Wedding"],
            "religions": ["Islam"],
            "ingredients": [
                {"name": "Rice", "amount": "200.00", "unit": "grams"},
                {"name": "Brand New Ingredient", "amount": "100.00", "unit": "grams"}
            ]
        },
        {
            "title": "Test Recipe Two",
            "description": "Another test recipe.",
            "author": "testuser2",
            "region": "Aegean",
            "is_published": True,
            "dietary_tags": ["Vegetarian"],
            "event_tags": [],
            "religions": [],
            "ingredients": [
                {"name": "Rice", "amount": "300.00", "unit": "grams"}
            ]
        }
    ],
    "stories": [
        {
            "title": "Test Story",
            "summary": "A test story summary.",
            "body": "This is the body of a test story.",
            "author": "testuser1",
            "region": "Black Sea",
            "language": "en",
            "is_published": True,
            "linked_recipes": ["Test Recipe One"],
            "dietary_tags": [],
            "event_tags": [],
            "religions": []
        }
    ],
    "cultural_content": [
        {
            "slug": "test-card",
            "kind": "tradition",
            "title": "Test Card",
            "body": "A test cultural content card.",
            "region": "Aegean",
            "cultural_tags": ["test"]
        }
    ],
    "recipe_ratings": [
        {"recipe": "Test Recipe One", "user": "testuser2", "score": 5},
        {"recipe": "Test Recipe One", "user": "testuser1", "score": 3},
        {"recipe": "Test Recipe Two", "user": "testuser1", "score": 4}
    ]
}


class SeedCanonicalCommandTest(TestCase):
    """Tests for the seed_canonical management command."""

    def setUp(self):
        Region.objects.get_or_create(name='Black Sea')
        Region.objects.get_or_create(name='Aegean')
        DietaryTag.objects.get_or_create(name='Halal', defaults={'is_approved': True})
        DietaryTag.objects.get_or_create(name='Vegetarian', defaults={'is_approved': True})
        EventTag.objects.get_or_create(name='Wedding', defaults={'is_approved': True})
        Religion.objects.get_or_create(name='Islam', defaults={'is_approved': True})
        Ingredient.objects.get_or_create(name='Rice', defaults={'is_approved': True})
        Unit.objects.get_or_create(name='grams', defaults={'is_approved': True})

        self._fixture_file = tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False, encoding='utf-8',
        )
        json.dump(MINIMAL_FIXTURE, self._fixture_file)
        self._fixture_file.close()
        self.fixture_path = self._fixture_file.name

    def tearDown(self):
        Path(self.fixture_path).unlink(missing_ok=True)

    def _run(self, **kwargs):
        call_command('seed_canonical', fixture=self.fixture_path, **kwargs)

    def test_creates_expected_counts(self):
        self._run()
        self.assertEqual(User.objects.filter(is_staff=False, is_superuser=False).count(), 2)
        self.assertEqual(Recipe.objects.count(), 2)
        self.assertEqual(Story.objects.count(), 1)
        self.assertEqual(CulturalContent.objects.count(), 1)

    def test_creates_recipe_ingredients(self):
        self._run()
        self.assertEqual(RecipeIngredient.objects.count(), 3)

    def test_creates_missing_ingredients_as_approved(self):
        self._run()
        self.assertTrue(Ingredient.objects.filter(name='Brand New Ingredient').exists())
        self.assertTrue(Ingredient.objects.get(name='Brand New Ingredient').is_approved)

    def test_creates_story_recipe_links(self):
        self._run()
        self.assertEqual(StoryRecipeLink.objects.count(), 1)
        self.assertEqual(StoryRecipeLink.objects.first().recipe.title, 'Test Recipe One')

    def test_sets_taxonomy_tags_on_recipe(self):
        self._run()
        recipe = Recipe.objects.get(title='Test Recipe One')
        self.assertQuerySetEqual(
            recipe.dietary_tags.values_list('name', flat=True), ['Halal'], ordered=False,
        )
        self.assertQuerySetEqual(
            recipe.event_tags.values_list('name', flat=True), ['Wedding'], ordered=False,
        )
        self.assertQuerySetEqual(
            recipe.religions.values_list('name', flat=True), ['Islam'], ordered=False,
        )

    def test_wipes_and_recreates_on_rerun(self):
        self._run()
        first_ids = set(Recipe.objects.values_list('id', flat=True))
        self._run()
        second_ids = set(Recipe.objects.values_list('id', flat=True))
        self.assertEqual(Recipe.objects.count(), 2)
        self.assertTrue(first_ids.isdisjoint(second_ids))

    def test_preserves_superusers(self):
        User.objects.create_superuser(
            email='admin@example.com', username='admin', password='Admin123!',
        )
        self._run()
        self.assertTrue(User.objects.filter(username='admin', is_superuser=True).exists())

    def test_dry_run_creates_nothing(self):
        self._run(dry_run=True)
        self.assertEqual(User.objects.filter(is_staff=False, is_superuser=False).count(), 0)
        self.assertEqual(Recipe.objects.count(), 0)
        self.assertEqual(Story.objects.count(), 0)
        self.assertEqual(CulturalContent.objects.count(), 0)

    def test_missing_region_raises_error(self):
        bad_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        bad_data['recipes'][0]['region'] = 'Nonexistent Region'
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(bad_data, f)
        with self.assertRaises(CommandError) as ctx:
            self._run()
        self.assertIn('Nonexistent Region', str(ctx.exception))

    def test_missing_recipe_in_story_raises_error(self):
        bad_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        bad_data['stories'][0]['linked_recipes'] = ['Nonexistent Recipe']
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(bad_data, f)
        with self.assertRaises(CommandError) as ctx:
            self._run()
        self.assertIn('Nonexistent Recipe', str(ctx.exception))

    def test_all_recipes_published(self):
        self._run()
        self.assertEqual(Recipe.objects.filter(is_published=True).count(), 2)

    def test_all_stories_published(self):
        self._run()
        self.assertEqual(Story.objects.filter(is_published=True).count(), 1)

    def test_users_can_authenticate(self):
        self._run()
        user = User.objects.get(username='testuser1')
        self.assertTrue(user.check_password('StrongPassword123!'))

    def test_attaches_image_to_recipe_when_file_exists(self):
        """Seeder attaches image from fixtures/media/recipes/ when image field is present."""
        fixture_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        fixture_data['recipes'][0]['image'] = 'test_recipe.jpg'
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(fixture_data, f)

        media_dir = Path(self.fixture_path).parent / 'fixtures' / 'media' / 'recipes'
        media_dir.mkdir(parents=True, exist_ok=True)
        img_path = media_dir / 'test_recipe.jpg'
        from PIL import Image
        img = Image.new('RGB', (2, 2), color='red')
        img.save(str(img_path), 'JPEG')

        from unittest.mock import patch
        with patch('apps.recipes.management.commands.seed_canonical.MEDIA_DIR',
                   Path(self.fixture_path).parent / 'fixtures' / 'media'):
            self._run()

        recipe = Recipe.objects.get(title='Test Recipe One')
        self.assertTrue(recipe.image)
        self.assertIn('test_recipe', recipe.image.name)

    def test_skips_image_when_file_missing(self):
        """Seeder warns but continues when image file doesn't exist."""
        fixture_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        fixture_data['recipes'][0]['image'] = 'nonexistent.jpg'
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(fixture_data, f)
        self._run()
        recipe = Recipe.objects.get(title='Test Recipe One')
        self.assertFalse(recipe.image)

    def test_recipe_without_image_field_has_no_image(self):
        """Recipes without an image field in the fixture get no image."""
        self._run()
        recipe = Recipe.objects.get(title='Test Recipe One')
        self.assertFalse(recipe.image)

    def test_attaches_image_to_story_when_file_exists(self):
        """Seeder attaches image from fixtures/media/stories/ when image field is present."""
        fixture_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        fixture_data['stories'][0]['image'] = 'test_story.jpg'
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(fixture_data, f)

        media_dir = Path(self.fixture_path).parent / 'fixtures' / 'media' / 'stories'
        media_dir.mkdir(parents=True, exist_ok=True)
        img_path = media_dir / 'test_story.jpg'
        from PIL import Image
        img = Image.new('RGB', (2, 2), color='blue')
        img.save(str(img_path), 'JPEG')

        from unittest.mock import patch
        with patch('apps.recipes.management.commands.seed_canonical.MEDIA_DIR',
                   Path(self.fixture_path).parent / 'fixtures' / 'media'):
            self._run()

        story = Story.objects.get(title='Test Story')
        self.assertTrue(story.image)
        self.assertIn('test_story', story.image.name)
    def test_seeds_meal_type(self):
        fixture_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        fixture_data['recipes'][0]['meal_type'] = 'soup'
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(fixture_data, f)
        self._run()
        recipe = Recipe.objects.get(title='Test Recipe One')
        self.assertEqual(recipe.meal_type, 'soup')

    def test_seeds_recipe_ratings(self):
        self._run()
        self.assertEqual(Rating.objects.count(), 3)

    def test_recipe_rating_aggregates_updated_after_seeding(self):
        self._run()
        recipe_one = Recipe.objects.get(title='Test Recipe One')
        self.assertEqual(recipe_one.rating_count, 2)
        self.assertEqual(float(recipe_one.average_rating), 4.0)  # (5 + 3) / 2
        recipe_two = Recipe.objects.get(title='Test Recipe Two')
        self.assertEqual(recipe_two.rating_count, 1)
        self.assertEqual(float(recipe_two.average_rating), 4.0)

    def test_recipe_ratings_associated_with_fixture_users_and_recipes(self):
        self._run()
        rating = Rating.objects.get(recipe__title='Test Recipe Two')
        self.assertEqual(rating.user.username, 'testuser1')
        self.assertEqual(rating.score, 4)

    def test_duplicate_recipe_rating_is_skipped(self):
        bad_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        bad_data['recipe_ratings'].append(
            {"recipe": "Test Recipe One", "user": "testuser2", "score": 1}
        )
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(bad_data, f)
        self._run()
        self.assertEqual(Rating.objects.count(), 3)
        # first entry wins; the duplicate score=1 is ignored
        self.assertEqual(
            Rating.objects.get(recipe__title='Test Recipe One', user__username='testuser2').score, 5,
        )

    def test_missing_recipe_in_ratings_raises_error(self):
        bad_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        bad_data['recipe_ratings'] = [
            {"recipe": "Nonexistent Recipe", "user": "testuser1", "score": 4}
        ]
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(bad_data, f)
        with self.assertRaises(CommandError) as ctx:
            self._run()
        self.assertIn('Nonexistent Recipe', str(ctx.exception))

    def test_missing_user_in_ratings_raises_error(self):
        bad_data = json.loads(json.dumps(MINIMAL_FIXTURE))
        bad_data['recipe_ratings'] = [
            {"recipe": "Test Recipe One", "user": "ghost", "score": 4}
        ]
        with open(self.fixture_path, 'w', encoding='utf-8') as f:
            json.dump(bad_data, f)
        with self.assertRaises(CommandError) as ctx:
            self._run()
        self.assertIn('ghost', str(ctx.exception))
