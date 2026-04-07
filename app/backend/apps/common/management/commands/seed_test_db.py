# -*- coding: utf-8 -*-
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.recipes.models import Region, Ingredient, Unit, Recipe, RecipeIngredient
from apps.stories.models import Story
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Populates the database with sample data for testing purposes.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        try:
            with transaction.atomic():
                self.seed_users()
                self.seed_regions()
                self.seed_units()
                self.seed_ingredients()
                self.seed_recipes()
                self.seed_stories()
            
            self.stdout.write(self.style.SUCCESS('Successfully seeded database!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Seeding failed: {str(e)}'))

    def seed_users(self):
        self.stdout.write('Creating users...')
        users_data = [
            {
                'email': 'student@example.com',
                'username': 'student',
                'password': 'testpass123',
                'bio': 'I am a student interested in food heritage.',
                'region': 'Aegean'
            },
            {
                'email': 'cook@example.com',
                'username': 'cook',
                'password': 'testpass123',
                'bio': 'Professional cook sharing ancestral recipes.',
                'region': 'Mediterranean'
            },
            {
                'email': 'admin@example.com',
                'username': 'admin',
                'password': 'testpass123',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True
            }
        ]
        
        for user_info in users_data:
            password = user_info.pop('password')
            user, created = User.objects.get_or_create(
                email=user_info['email'],
                defaults=user_info
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f'Created user: {user.username}')
            else:
                self.stdout.write(f'User already exists: {user.username}')

    def seed_regions(self):
        self.stdout.write('Creating regions...')
        regions = [
            # Turkey
            'Aegean', 'Anatolian', 'Black Sea', 'Marmara', 'Mediterranean',
            'Southeastern Anatolia',
            # Middle East
            'Levantine', 'Persian', 'Arabian',
            # Europe
            'Balkan', 'Central European', 'Eastern European', 'French',
            'Iberian', 'Italian', 'Nordic', 'British Isles',
            # Asia
            'Central Asian', 'Chinese', 'Indian', 'Japanese', 'Korean',
            'Southeast Asian',
            # Africa
            'East African', 'North African', 'West African',
            # Americas
            'Caribbean', 'Central American', 'North American', 'South American',
            # Oceania
            'Oceanian',
        ]
        for name in regions:
            region, created = Region.objects.get_or_create(name=name)
            if created:
                self.stdout.write(f'Created region: {name}')

    def seed_units(self):
        self.stdout.write('Creating units...')
        units = [
            'grams', 'kg', 'liters', 'ml', 'cups', 'tablespoons', 'teaspoons',
            'pieces', 'cloves', 'pinch', 'bunch', 'slices',
        ]
        for name in units:
            unit, created = Unit.objects.get_or_create(name=name, defaults={'is_approved': True})
            if created:
                self.stdout.write(f'Created unit: {name}')

    def seed_ingredients(self):
        self.stdout.write('Creating ingredients...')
        ingredients = [
            'Butter', 'Chicken', 'Cinnamon', 'Cream', 'Cumin', 'Eggplant',
            'Eggs', 'Feta Cheese', 'Flour', 'Garlic', 'Ginger', 'Green Pepper',
            'Ground Beef', 'Ground Lamb', 'Honey', 'Lamb', 'Lemon', 'Lentils',
            'Mint', 'Mozzarella', 'Olive Oil', 'Onion', 'Oregano', 'Paprika',
            'Parsley', 'Pasta', 'Pepper', 'Phyllo Dough', 'Pine Nuts', 'Pistachios',
            'Potato', 'Red Pepper Flakes', 'Rice', 'Salt', 'Sesame Seeds',
            'Sugar', 'Sumac', 'Tahini', 'Thyme', 'Tomato', 'Tomato Paste',
            'Turmeric', 'Walnuts', 'Yogurt', 'Zucchini',
        ]
        for name in ingredients:
            ing, created = Ingredient.objects.get_or_create(name=name, defaults={'is_approved': True})
            if created:
                self.stdout.write(f'Created ingredient: {name}')

    def seed_recipes(self):
        self.stdout.write('Creating recipes...')
        cook = User.objects.get(username='cook')
        student = User.objects.get(username='student')
        med_region = Region.objects.get(name='Mediterranean')
        ana_region = Region.objects.get(name='Anatolian')
        
        recipes_data = [
            {
                'title': 'Stuffed Eggplant (Karnıyarık)',
                'description': 'A classic Ottoman dish consisting of eggplant stuffed with a mix of sautéed chopped onions, garlic, black pepper, tomatoes, green pepper and ground meat.',
                'author': cook,
                'region': med_region,
                'is_published': True,
                'ingredients': [
                    {'name': 'Tomato', 'amount': 2, 'unit': 'units'},
                    {'name': 'Garlic', 'amount': 3, 'unit': 'cloves'},
                    {'name': 'Olive Oil', 'amount': 50, 'unit': 'ml'}
                ]
            },
            {
                'title': 'Lentil Soup',
                'description': 'Simple and nutritious traditional lentil soup.',
                'author': student,
                'region': ana_region,
                'is_published': True,
                'ingredients': [
                    {'name': 'Lentils', 'amount': 1, 'unit': 'cups'},
                    {'name': 'Onion', 'amount': 1, 'unit': 'units'},
                    {'name': 'Olive Oil', 'amount': 2, 'unit': 'tablespoons'}
                ]
            }
        ]

        for r_info in recipes_data:
            ings_data = r_info.pop('ingredients')
            recipe, created = Recipe.objects.get_or_create(
                title=r_info['title'],
                author=r_info['author'],
                defaults=r_info
            )
            
            if created:
                for item in ings_data:
                    ingredient = Ingredient.objects.get(name=item['name'])
                    unit = Unit.objects.get(name=item['unit'])
                    RecipeIngredient.objects.create(
                        recipe=recipe,
                        ingredient=ingredient,
                        amount=item['amount'],
                        unit=unit
                    )
                self.stdout.write(f'Created recipe: {recipe.title}')
            else:
                self.stdout.write(f'Recipe already exists: {recipe.title}')

    def seed_stories(self):
        self.stdout.write('Creating stories...')
        cook = User.objects.get(username='cook')
        recipe = Recipe.objects.first()
        
        stories_data = [
            {
                'title': 'Grandma\'s Kitchen Secrets',
                'body': 'I remember the smell of fresh herbs and olive oil every Sunday... My grandmother used to tell me that the secret to a good Karn\u0131yar\u0131k is to salt the eggplants first.',
                'author': cook,
                'linked_recipe': recipe,
                'is_published': True
            }
        ]
        
        for s_info in stories_data:
            story, created = Story.objects.get_or_create(
                title=s_info['title'],
                author=s_info['author'],
                defaults=s_info
            )
            if created:
                self.stdout.write(f'Created story: {story.title}')
            else:
                self.stdout.write(f'Story already exists: {story.title}')
