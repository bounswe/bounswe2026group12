import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.recipes.models import (
    Recipe, RecipeIngredient, Region, Ingredient, Unit,
    DietaryTag, EventTag, Religion, Comment, Vote,
)
from apps.stories.models import Story, StoryRecipeLink, StoryComment, StoryVote
from apps.cultural_content.models import CulturalContent
from apps.notifications.models import Notification, DeviceToken
from apps.messaging.models import Thread, ThreadParticipant, Message

User = get_user_model()

DEFAULT_FIXTURE = Path(__file__).resolve().parents[4] / 'fixtures' / 'seed_canonical.json'


class Command(BaseCommand):
    help = 'Wipe and re-seed the database with canonical fixture data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would happen without writing to the database.',
        )
        parser.add_argument(
            '--fixture', type=str, default=None,
            help='Path to fixture JSON (default: fixtures/seed_canonical.json).',
        )

    def handle(self, *args, **options):
        fixture_path = Path(options['fixture']) if options['fixture'] else DEFAULT_FIXTURE
        data = self._load_fixture(fixture_path)

        if options['dry_run']:
            self.stdout.write(
                f'DRY RUN: Would create {len(data["users"])} users, '
                f'{len(data["recipes"])} recipes, '
                f'{len(data["stories"])} stories, '
                f'{len(data.get("recipe_comments", []))} recipe comments, '
                f'{len(data.get("story_comments", []))} story comments, '
                f'{len(data["cultural_content"])} cultural content cards.'
            )
            return

        with transaction.atomic():
            self._wipe()
            users = self._seed_users(data['users'])
            recipes = self._seed_recipes(data['recipes'], users)
            stories = self._seed_stories(data['stories'], users, recipes)
            self._seed_recipe_comments(data.get('recipe_comments', []), users, recipes)
            self._seed_story_comments(data.get('story_comments', []), users, stories)
            cards = self._seed_cultural_content(data['cultural_content'])

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(users)} users, {len(recipes)} recipes, '
            f'{len(stories)} stories, {len(cards)} cultural content cards.'
        ))

    def _load_fixture(self, path):
        if not path.exists():
            raise CommandError(f'Fixture not found: {path}')
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _wipe(self):
        CulturalContent.objects.all().delete()
        Notification.objects.all().delete()
        DeviceToken.objects.all().delete()
        StoryVote.objects.all().delete()
        StoryComment.objects.all().delete()
        StoryRecipeLink.objects.all().delete()
        Story.objects.all().delete()
        Vote.objects.all().delete()
        Comment.objects.all().delete()
        RecipeIngredient.objects.all().delete()
        Recipe.objects.all().delete()
        Message.objects.all().delete()
        ThreadParticipant.objects.all().delete()
        Thread.objects.all().delete()
        User.objects.filter(is_staff=False, is_superuser=False).delete()

    def _resolve(self, model, name):
        try:
            return model.objects.get(name=name)
        except model.DoesNotExist:
            raise CommandError(
                f"{model.__name__} '{name}' not found. Run migrations first."
            )

    def _resolve_many(self, model, names):
        return [self._resolve(model, n) for n in names]

    def _seed_users(self, users_data):
        users = {}
        for u in users_data:
            user = User.objects.create_user(
                email=u['email'],
                username=u['username'],
                password=u['password'],
                bio=u.get('bio', ''),
                region=u.get('region', ''),
                preferred_language=u.get('preferred_language', 'en'),
                cultural_interests=u.get('cultural_interests', []),
                regional_ties=u.get('regional_ties', []),
                religious_preferences=u.get('religious_preferences', []),
                event_interests=u.get('event_interests', []),
            )
            users[u['username']] = user
        return users

    def _seed_recipes(self, recipes_data, users):
        recipes = {}
        for r in recipes_data:
            region = self._resolve(Region, r['region']) if r.get('region') else None
            recipe = Recipe.objects.create(
                title=r['title'],
                description=r['description'],
                author=users[r['author']],
                region=region,
                is_published=r.get('is_published', True),
            )
            if r.get('dietary_tags'):
                recipe.dietary_tags.set(
                    self._resolve_many(DietaryTag, r['dietary_tags'])
                )
            if r.get('event_tags'):
                recipe.event_tags.set(
                    self._resolve_many(EventTag, r['event_tags'])
                )
            if r.get('religions'):
                recipe.religions.set(
                    self._resolve_many(Religion, r['religions'])
                )
            if r.get('steps'):
                recipe.steps = r['steps']
                recipe.save(update_fields=['steps'])
            for ing in r.get('ingredients', []):
                ingredient, _ = Ingredient.objects.get_or_create(
                    name=ing['name'], defaults={'is_approved': True},
                )
                unit = None
                if ing.get('unit'):
                    unit, _ = Unit.objects.get_or_create(
                        name=ing['unit'], defaults={'is_approved': True},
                    )
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient=ingredient,
                    amount=ing['amount'],
                    unit=unit,
                )
            recipes[r['title']] = recipe
        return recipes

    def _seed_stories(self, stories_data, users, recipes):
        stories = []
        for s in stories_data:
            region = self._resolve(Region, s['region']) if s.get('region') else None
            story = Story.objects.create(
                title=s['title'],
                summary=s.get('summary', ''),
                body=s['body'],
                author=users[s['author']],
                region=region,
                language=s.get('language', 'en'),
                is_published=s.get('is_published', True),
            )
            if s.get('dietary_tags'):
                story.dietary_tags.set(
                    self._resolve_many(DietaryTag, s['dietary_tags'])
                )
            if s.get('event_tags'):
                story.event_tags.set(
                    self._resolve_many(EventTag, s['event_tags'])
                )
            if s.get('religions'):
                story.religions.set(
                    self._resolve_many(Religion, s['religions'])
                )
            for order, title in enumerate(s.get('linked_recipes', [])):
                if title not in recipes:
                    raise CommandError(
                        f"Story '{s['title']}' references recipe '{title}' "
                        f"not found in fixture."
                    )
                StoryRecipeLink.objects.create(
                    story=story, recipe=recipes[title], order=order,
                )
            stories.append(story)
        return stories

    def _seed_recipe_comments(self, comments_data, users, recipes):
        """Seed recipe comments/questions with optional nested replies."""
        id_map = {}
        for c in comments_data:
            recipe = recipes.get(c['recipe'])
            if not recipe:
                raise CommandError(f"recipe_comments: recipe '{c['recipe']}' not found.")
            parent = id_map.get(c.get('parent_ref')) if c.get('parent_ref') else None
            comment = Comment.objects.create(
                recipe=recipe,
                author=users[c['author']],
                body=c['body'],
                type=c.get('type', 'COMMENT'),
                parent_comment=parent,
            )
            if c.get('ref'):
                id_map[c['ref']] = comment

    def _seed_story_comments(self, comments_data, users, stories):
        """Seed story comments/questions with optional nested replies."""
        story_map = {s.title: s for s in stories}
        id_map = {}
        for c in comments_data:
            story = story_map.get(c['story'])
            if not story:
                raise CommandError(f"story_comments: story '{c['story']}' not found.")
            parent = id_map.get(c.get('parent_ref')) if c.get('parent_ref') else None
            comment = StoryComment.objects.create(
                story=story,
                author=users[c['author']],
                body=c['body'],
                type=c.get('type', 'COMMENT'),
                parent_comment=parent,
            )
            if c.get('ref'):
                id_map[c['ref']] = comment

    def _seed_cultural_content(self, cards_data):
        cards = []
        for c in cards_data:
            region = self._resolve(Region, c['region']) if c.get('region') else None
            card = CulturalContent.objects.create(
                slug=c['slug'],
                kind=c['kind'],
                title=c['title'],
                body=c['body'],
                region=region,
                cultural_tags=c.get('cultural_tags', []),
            )
            cards.append(card)
        return cards
