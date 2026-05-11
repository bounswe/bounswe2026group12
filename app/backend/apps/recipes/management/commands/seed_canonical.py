import json
from decimal import Decimal
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model

MEDIA_DIR = Path(__file__).resolve().parents[4] / 'fixtures' / 'media'

from apps.recipes.models import (
    Recipe, RecipeIngredient, Region, Ingredient, IngredientSubstitution, Unit,
    DietaryTag, EventTag, Religion, Comment, Vote,
)
from apps.stories.models import Story, StoryRecipeLink
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

        substitutions_data = data.get('ingredient_substitutions', [])

        if options['dry_run']:
            self.stdout.write(
                f'DRY RUN: Would create {len(data["users"])} users, '
                f'{len(data["recipes"])} recipes, '
                f'{len(data["stories"])} stories, '
                f'{len(data["cultural_content"])} cultural content cards, '
                f'{len(substitutions_data)} ingredient substitutions.'
            )
            return

        with transaction.atomic():
            self._wipe()
            users = self._seed_users(data['users'])
            recipes = self._seed_recipes(data['recipes'], users)
            stories = self._seed_stories(data['stories'], users, recipes)
            cards = self._seed_cultural_content(data['cultural_content'])
            sub_created, sub_skipped = self._seed_substitutions(substitutions_data)

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(users)} users, {len(recipes)} recipes, '
            f'{len(stories)} stories, {len(cards)} cultural content cards, '
            f'{sub_created} substitutions added ({sub_skipped} already present).'
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
            if r.get('image'):
                img_path = MEDIA_DIR / 'recipes' / r['image']
                if img_path.exists():
                    with open(img_path, 'rb') as f:
                        recipe.image.save(r['image'], File(f), save=True)
                else:
                    self.stderr.write(
                        self.style.WARNING(f"Image not found: {img_path}")
                    )
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
            if s.get('image'):
                img_path = MEDIA_DIR / 'stories' / s['image']
                if img_path.exists():
                    with open(img_path, 'rb') as f:
                        story.image.save(s['image'], File(f), save=True)
                else:
                    self.stderr.write(
                        self.style.WARNING(f"Image not found: {img_path}")
                    )
        return stories

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

    def _seed_substitutions(self, subs_data):
        # Idempotent restore of the canonical ingredient substitution graph.
        # Resolves ingredients by name (created earlier by migrations or by
        # _seed_recipes), so a wiped IngredientSubstitution table is repopulated
        # without requiring migration 0010 to re-run.
        if not subs_data:
            return 0, 0
        name_to_obj = {ing.name: ing for ing in Ingredient.objects.all()}
        missing = set()
        created = 0
        skipped = 0
        for row in subs_data:
            from_ing = name_to_obj.get(row['from'])
            to_ing = name_to_obj.get(row['to'])
            if not from_ing:
                missing.add(row['from'])
                continue
            if not to_ing:
                missing.add(row['to'])
                continue
            _, was_created = IngredientSubstitution.objects.get_or_create(
                from_ingredient=from_ing,
                to_ingredient=to_ing,
                match_type=row['match_type'],
                defaults={
                    'closeness': Decimal(row['closeness']),
                    'notes': row.get('notes', ''),
                },
            )
            if was_created:
                created += 1
            else:
                skipped += 1
        if missing:
            raise CommandError(
                f"Substitution seed references ingredients that are not seeded: {sorted(missing)}"
            )
        return created, skipped
