import json
from decimal import Decimal
from pathlib import Path

from django.contrib.contenttypes.models import ContentType
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model

MEDIA_DIR = Path(__file__).resolve().parents[4] / 'fixtures' / 'media'

from apps.cultural_content.models import CulturalContent, CulturalEvent, CulturalEventRecipe
from apps.heritage.models import (
    CulturalFact, HeritageGroup, HeritageGroupMembership, HeritageJourneyStep,
)
from apps.messaging.models import Thread, ThreadParticipant, Message
from apps.notifications.models import Notification, DeviceToken
from apps.recipes.models import (
    Recipe, RecipeIngredient, Region, Ingredient, IngredientSubstitution, Unit,
    DietaryTag, EventTag, Religion, Comment, Vote, EndangeredNote,
    RecipeCulturalContext, IngredientRoute
)
from apps.stories.models import Story, StoryRecipeLink, StoryComment, StoryVote
from apps.passport.models import Quest, UserQuest

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
        heritage_data = data.get('heritage', {})
        heritage_groups = heritage_data.get('groups', [])
        cultural_events_data = data.get('cultural_events', [])
        ingredient_routes_data = data.get('ingredient_routes', [])
        quests_data = data.get('quests', [])

        if options['dry_run']:
            self.stdout.write(
                f'DRY RUN: Would create {len(data["users"])} users, '
                f'{len(data["recipes"])} recipes, '
                f'{len(data["stories"])} stories, '
                f'{len(data.get("recipe_comments", []))} recipe comments, '
                f'{len(data.get("story_comments", []))} story comments, '
                f'{len(data["cultural_content"])} cultural content cards, '
                f'{len(quests_data)} quests, '
                f'{len(substitutions_data)} ingredient substitutions, '
                f'{len(heritage_groups)} heritage groups, '
                f'{len(cultural_events_data)} cultural events, '
                f'{len(ingredient_routes_data)} ingredient routes.'
            )
            return

        with transaction.atomic():
            self._wipe()
            users = self._seed_users(data['users'])
            recipes = self._seed_recipes(data['recipes'], users)
            stories = self._seed_stories(data['stories'], users, recipes)
            self._seed_recipe_comments(data.get('recipe_comments', []), users, recipes)
            self._seed_story_comments(data.get('story_comments', []), users, stories)
            cards = self._seed_cultural_content(data['cultural_content'], recipes, stories)
            quest_count = self._seed_quests(quests_data)
            sub_created, sub_skipped = self._seed_substitutions(substitutions_data)
            heritage_stats = self._seed_heritage(heritage_data, recipes, stories)
            event_stats = self._seed_cultural_events(cultural_events_data, recipes)
            route_stats = self._seed_ingredient_routes(ingredient_routes_data)

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(users)} users, {len(recipes)} recipes, '
            f'{len(stories)} stories, {len(cards)} cultural content cards, '
            f'{quest_count} quests, '
            f'{sub_created} substitutions added ({sub_skipped} already present), '
            f'{heritage_stats["groups"]} heritage groups '
            f'({heritage_stats["memberships"]} memberships, '
            f'{heritage_stats["steps"]} journey steps, '
            f'{heritage_stats["facts"]} cultural facts), '
            f'{event_stats["events"]} cultural events '
            f'({event_stats["links"]} recipe links), '
            f'{route_stats} ingredient migration routes.'
        ))

    def _load_fixture(self, path):
        if not path.exists():
            raise CommandError(f'Fixture not found: {path}')
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _wipe(self):
        # passport (Quest/UserQuest only; CulturalPassport, Stamp,
        # StampInteraction, PassportEvent are auto-managed and cascade from User)
        UserQuest.objects.all().delete()
        Quest.objects.all().delete()
        # heritage
        CulturalFact.objects.all().delete()
        HeritageJourneyStep.objects.all().delete()
        HeritageGroupMembership.objects.all().delete()
        HeritageGroup.objects.all().delete()
        # cultural_content
        CulturalContent.objects.all().delete()
        CulturalEventRecipe.objects.all().delete()
        CulturalEvent.objects.all().delete()
        Notification.objects.all().delete()
        DeviceToken.objects.all().delete()
        StoryVote.objects.all().delete()
        StoryComment.objects.all().delete()
        StoryRecipeLink.objects.all().delete()
        Story.objects.all().delete()
        Vote.objects.all().delete()
        Comment.objects.all().delete()
        RecipeIngredient.objects.all().delete()
        RecipeCulturalContext.objects.all().delete()
        Recipe.objects.all().delete()
        IngredientRoute.objects.all().delete()
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
                meal_type=r.get('meal_type', ''),
                is_published=r.get('is_published', True),
                is_heritage=r.get('is_heritage', False),
                heritage_status=r.get('heritage_status', 'none'),
                heritage_notes=r.get('heritage_notes', ''),
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
                    name=ing['name'],
                    defaults={
                        'is_approved': True,
                        'heritage_status': ing.get('heritage_status', 'none'),
                    },
                )
                if ing.get('heritage_status') and ingredient.heritage_status == 'none':
                    ingredient.heritage_status = ing['heritage_status']
                    ingredient.save(update_fields=['heritage_status'])
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
            if r.get('endangered_notes'):
                for note in r['endangered_notes']:
                    EndangeredNote.objects.create(
                        recipe=recipe,
                        text=note['text'],
                        source_url=note.get('source_url', ''),
                    )
            if r.get('cultural_context'):
                RecipeCulturalContext.objects.create(
                    recipe=recipe,
                    **r['cultural_context']
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
        stories = {}
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
                story_type=s.get('story_type', ''),
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
            stories[s['title']] = story
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
        id_map = {}
        for c in comments_data:
            story = stories.get(c['story'])
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

    def _seed_cultural_content(self, cards_data, recipes, stories):
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
            link = c.get('link')
            if link:
                if link['kind'] == 'recipe':
                    if link['title'] not in recipes:
                        raise CommandError(
                            f"Cultural content '{c['slug']}' references recipe "
                            f"'{link['title']}' not found in fixture."
                        )
                    card.link_kind = CulturalContent.LinkKind.RECIPE
                    card.link_id = recipes[link['title']].id
                elif link['kind'] == 'story':
                    if link['title'] not in stories:
                        raise CommandError(
                            f"Cultural content '{c['slug']}' references story "
                            f"'{link['title']}' not found in fixture."
                        )
                    card.link_kind = CulturalContent.LinkKind.STORY
                    card.link_id = stories[link['title']].id
                card.save(update_fields=['link_kind', 'link_id'])
            cards.append(card)
        return cards

    def _seed_quests(self, quests_data):
        if not quests_data:
            return 0
        count = 0
        for q in quests_data:
            Quest.objects.create(
                name=q['name'],
                description=q.get('description', ''),
                category=q['category'],
                target_count=q.get('target_count', 1),
                filter_criteria=q.get('filter_criteria', {}),
                reward_type=q['reward_type'],
                reward_value=q.get('reward_value', ''),
                is_event_quest=q.get('is_event_quest', False),
                event_start=q.get('event_start'),
                event_end=q.get('event_end'),
            )
            count += 1
        return count

    def _seed_heritage(self, heritage_data, recipes, stories):
        groups_data = heritage_data.get('groups', [])
        if not groups_data:
            return {'groups': 0, 'memberships': 0, 'steps': 0, 'facts': 0}

        recipe_ct = ContentType.objects.get_for_model(Recipe)
        story_ct = ContentType.objects.get_for_model(Story)

        group_count = 0
        membership_count = 0
        step_count = 0
        fact_count = 0

        for g in groups_data:
            group = HeritageGroup.objects.create(
                name=g['name'],
                description=g.get('description', ''),
            )
            group_count += 1

            for title in g.get('recipe_members', []):
                if title not in recipes:
                    raise CommandError(
                        f"Heritage group '{g['name']}' references recipe "
                        f"'{title}' not found in fixture."
                    )
                HeritageGroupMembership.objects.create(
                    heritage_group=group,
                    content_type=recipe_ct,
                    object_id=recipes[title].id,
                )
                membership_count += 1

            for title in g.get('story_members', []):
                if title not in stories:
                    raise CommandError(
                        f"Heritage group '{g['name']}' references story "
                        f"'{title}' not found in fixture."
                    )
                HeritageGroupMembership.objects.create(
                    heritage_group=group,
                    content_type=story_ct,
                    object_id=stories[title].id,
                )
                membership_count += 1

            for step in g.get('journey_steps', []):
                HeritageJourneyStep.objects.create(
                    heritage_group=group,
                    order=step['order'],
                    location=step['location'],
                    story=step['story'],
                    era=step.get('era', ''),
                )
                step_count += 1

            for fact in g.get('cultural_facts', []):
                region = (
                    self._resolve(Region, fact['region'])
                    if fact.get('region')
                    else None
                )
                CulturalFact.objects.create(
                    heritage_group=group,
                    region=region,
                    text=fact['text'],
                    source_url=fact.get('source_url', ''),
                )
                fact_count += 1

        return {
            'groups': group_count,
            'memberships': membership_count,
            'steps': step_count,
            'facts': fact_count,
        }

    def _seed_cultural_events(self, events_data, recipes):
        if not events_data:
            return {'events': 0, 'links': 0}

        event_count = 0
        link_count = 0

        for e in events_data:
            region = (
                self._resolve(Region, e['region'])
                if e.get('region')
                else None
            )
            event = CulturalEvent.objects.create(
                name=e['name'],
                date_rule=e['date_rule'],
                region=region,
                description=e.get('description', ''),
            )
            event_count += 1

            for title in e.get('linked_recipes', []):
                if title not in recipes:
                    raise CommandError(
                        f"Cultural event '{e['name']}' references recipe "
                        f"'{title}' not found in fixture."
                    )
                CulturalEventRecipe.objects.create(
                    event=event,
                    recipe=recipes[title],
                )
                link_count += 1

        return {'events': event_count, 'links': link_count}

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

    def _seed_ingredient_routes(self, routes_data):
        if not routes_data:
            return 0
        count = 0
        for row in routes_data:
            ingredient = self._resolve(Ingredient, row['ingredient'])
            IngredientRoute.objects.create(
                ingredient=ingredient,
                waypoints=row['waypoints'],
            )
            count += 1
        return count
