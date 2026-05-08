from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.recipes.models import Recipe, Region, DietaryTag, EventTag, Religion
from apps.stories.models import Story

User = get_user_model()

class ExploreBackendTest(APITestCase):
    """Verify Event-based Explore (#386) and Religion context (#388)."""

    @classmethod
    def setUpTestData(cls):
        cls.author = User.objects.create_user(
            email='explore@example.com', username='explorer', password='Pass123!'
        )
        
        cls.region_balkans, _ = Region.objects.get_or_create(name='Balkans')
        cls.diet_vegan, _ = DietaryTag.objects.get_or_create(name='Vegan', defaults={'is_approved': True})
        cls.event_wedding, _ = EventTag.objects.get_or_create(name='Wedding', defaults={'is_approved': True})
        cls.event_graduation, _ = EventTag.objects.get_or_create(name='Graduation', defaults={'is_approved': True})
        cls.rel_islam, _ = Religion.objects.get_or_create(name='Islam', defaults={'is_approved': True})
        cls.rel_christian, _ = Religion.objects.get_or_create(name='Christianity', defaults={'is_approved': True})

        # Recipe: Muslim Wedding
        cls.recipe_wedding = Recipe.objects.create(
            title='Muslim Wedding Dish',
            description='Traditional dish for weddings.',
            author=cls.author,
            is_published=True
        )
        cls.recipe_wedding.event_tags.add(cls.event_wedding)
        cls.recipe_wedding.religions.add(cls.rel_islam)

        # Story: Balkan Graduation
        cls.story_grad = Story.objects.create(
            title='Balkan Graduation Story',
            body='A story about graduating in the Balkans.',
            author=cls.author,
            region=cls.region_balkans,
            is_published=True
        )
        cls.story_grad.event_tags.add(cls.event_graduation)
        
        # Story: Vegan Christian Event
        cls.story_vegan_christian = Story.objects.create(
            title='Vegan Christian Gathering',
            body='A vegan feast at a Christian event.',
            author=cls.author,
            is_published=True
        )
        cls.story_vegan_christian.dietary_tags.add(cls.diet_vegan)
        cls.story_vegan_christian.religions.add(cls.rel_christian)

    def test_filter_by_religion(self):
        response = self.client.get('/api/search/', {'religion': 'Islam'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return the recipe
        recipe_titles = [r['title'] for r in response.data['recipes']]
        self.assertIn('Muslim Wedding Dish', recipe_titles)
        self.assertEqual(len(response.data['stories']), 0)

    def test_filter_by_event_for_stories(self):
        response = self.client.get('/api/search/', {'event': 'Graduation'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        story_titles = [s['title'] for s in response.data['stories']]
        self.assertIn('Balkan Graduation Story', story_titles)
        self.assertEqual(len(response.data['recipes']), 0)

    def test_combined_filters_religion_and_event(self):
        # "Muslim + wedding"
        response = self.client.get('/api/search/', {'religion': 'Islam', 'event': 'Wedding'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recipe_titles = [r['title'] for r in response.data['recipes']]
        self.assertIn('Muslim Wedding Dish', recipe_titles)
        self.assertEqual(len(recipe_titles), 1)

    def test_combined_filters_region_and_event(self):
        # "Balkans + graduation"
        response = self.client.get('/api/search/', {'region': 'Balkans', 'event': 'Graduation'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        story_titles = [s['title'] for s in response.data['stories']]
        self.assertIn('Balkan Graduation Story', story_titles)
        self.assertEqual(len(story_titles), 1)

    def test_religion_serialization_on_recipe(self):
        response = self.client.get(f'/api/recipes/{self.recipe_wedding.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('religions', response.data)
        rel_names = [r['name'] for r in response.data['religions']]
        self.assertIn('Islam', rel_names)

    def test_taxonomy_serialization_on_story(self):
        response = self.client.get(f'/api/stories/{self.story_vegan_christian.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('dietary_tags', response.data)
        self.assertIn('religions', response.data)
        diet_names = [d['name'] for d in response.data['dietary_tags']]
        rel_names = [r['name'] for r in response.data['religions']]
        self.assertIn('Vegan', diet_names)
        self.assertIn('Christianity', rel_names)

    def test_filter_by_linked_recipe_region(self):
        """Verify that a story with no direct region is found via its linked recipe's region."""
        # story.region is null, but recipe has a region
        recipe = Recipe.objects.create(
            title='Mediterranean Salad',
            description='Fresh salad',
            author=self.author,
            region=self.region_balkans,
            is_published=True
        )
        story = Story.objects.create(
            title='Salad Days',
            body='Making salad without direct region',
            author=self.author,
            region=None,
            is_published=True
        )
        from apps.stories.models import StoryRecipeLink
        StoryRecipeLink.objects.create(story=story, recipe=recipe, order=0)
        
        # Searching by Balkans should find it
        response = self.client.get('/api/search/', {'region': 'Balkans'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        story_titles = [s['title'] for s in response.data['stories']]
        self.assertIn('Salad Days', story_titles)
