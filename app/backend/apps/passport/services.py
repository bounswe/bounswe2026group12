"""Cultural passport business logic: stamps, quests, points/level (#584-#588).

The point weights and level thresholds here are the single source of truth.
The web and mobile clients mirror these numbers for their level-up UI, so do
not change them without flagging the frontend.
"""
from django.db.models import Q
from django.utils import timezone

from .models import (
    CulturalPassport,
    PassportEvent,
    Quest,
    Stamp,
    StampInteraction,
    UserQuest,
)

UNKNOWN_CULTURE = 'unknown'

# Points awarded per contributing action (#587). "recipe saved to passport" is
# the act of pinning a tried recipe to the passport, which the try/ endpoint
# does implicitly, so it is counted once per tried recipe alongside
# "recipe tried".
POINT_WEIGHTS = {
    'recipe_tried': 5,
    'recipe_saved_to_passport': 2,
    'story_saved': 3,
    'heritage_recipe_shared': 15,
    'quest_completed': 20,
    'gold_stamp': 8,
    'emerald_stamp': 12,
    'legendary_stamp': 25,
    'comment_submitted': 1,
}

# (level, min points). Descending so the first match wins. Names per #587.
LEVEL_THRESHOLDS = [
    (6, 1000),
    (5, 500),
    (4, 250),
    (3, 100),
    (2, 30),
    (1, 0),
]
LEVEL_NAMES = {
    1: 'Curious Visitor',
    2: 'Kitchen Traveler',
    3: 'Cultural Explorer',
    4: 'Story Collector',
    5: 'Heritage Keeper',
    6: 'Living Archive',
}

# Rarities that themselves contribute points when earned.
RARITY_POINT_KEYS = {
    Stamp.RARITY_GOLD: 'gold_stamp',
    Stamp.RARITY_EMERALD: 'emerald_stamp',
    Stamp.RARITY_LEGENDARY: 'legendary_stamp',
}

# Interaction count thresholds for the depth-based rarities.
SILVER_THRESHOLD = 3
GOLD_THRESHOLD = 7
LEGENDARY_INTERACTION_THRESHOLD = 12


# --------------------------------------------------------------------------
# Level / points
# --------------------------------------------------------------------------

def level_for_points(points):
    for level, threshold in LEVEL_THRESHOLDS:
        if points >= threshold:
            return level
    return 1


def recalculate_passport_points(user):
    """Recompute total_points and level for `user` from scratch.

    Idempotent: derives everything from current counts, so it is safe to call
    after any action (or twice). Writes a `level_up` PassportEvent when the
    level increases. Returns a dict describing the transition.
    """
    from apps.recipes.models import Comment, Recipe

    recipes_tried = StampInteraction.objects.filter(
        user=user, kind=StampInteraction.KIND_RECIPE_TRY,
    ).count()
    stories_saved = StampInteraction.objects.filter(
        user=user, kind=StampInteraction.KIND_STORY_SAVE,
    ).count()
    heritage_shared = Recipe.objects.filter(author=user, is_heritage=True).count()
    quests_completed = UserQuest.objects.filter(
        user=user, completed_at__isnull=False,
    ).count()
    gold = Stamp.objects.filter(user=user, rarity=Stamp.RARITY_GOLD).count()
    emerald = Stamp.objects.filter(user=user, rarity=Stamp.RARITY_EMERALD).count()
    legendary = Stamp.objects.filter(user=user, rarity=Stamp.RARITY_LEGENDARY).count()
    comments = Comment.objects.filter(author=user).count()

    total = (
        recipes_tried * (POINT_WEIGHTS['recipe_tried'] + POINT_WEIGHTS['recipe_saved_to_passport'])
        + stories_saved * POINT_WEIGHTS['story_saved']
        + heritage_shared * POINT_WEIGHTS['heritage_recipe_shared']
        + quests_completed * POINT_WEIGHTS['quest_completed']
        + gold * POINT_WEIGHTS['gold_stamp']
        + emerald * POINT_WEIGHTS['emerald_stamp']
        + legendary * POINT_WEIGHTS['legendary_stamp']
        + comments * POINT_WEIGHTS['comment_submitted']
    )

    passport, _ = CulturalPassport.objects.get_or_create(user=user)
    previous_level = passport.level
    new_level = level_for_points(total)
    passport.total_points = total
    passport.level = new_level
    passport.save(update_fields=['total_points', 'level', 'updated_at'])

    leveled_up = new_level > previous_level
    if leveled_up:
        PassportEvent.objects.create(
            user=user,
            event_type=PassportEvent.TYPE_LEVEL_UP,
            description=f'Reached Level {new_level}: {LEVEL_NAMES[new_level]}',
            timestamp=timezone.now(),
        )
    return {
        'leveled_up': leveled_up,
        'previous_level': previous_level,
        'level': new_level,
        'total_points': total,
    }


# --------------------------------------------------------------------------
# Stamps
# --------------------------------------------------------------------------

def _user_contributed_to_culture(user, culture):
    """True if the user has authored their own recipe or story in this culture."""
    from apps.recipes.models import Recipe
    from apps.stories.models import Story

    if Recipe.objects.filter(author=user, region__name=culture).exists():
        return True
    return Story.objects.filter(author=user, region__name=culture).exists()


def _has_heritage_video_interaction(user, culture):
    """True if the user has tried a heritage recipe with a video in this culture.

    This is the concrete trigger for a Legendary stamp. The platform has no
    "3-generation story" field, so a heritage recipe carrying audio/video plus
    a deep interaction history is the proxy for the spec's rare combination.
    """
    return (
        StampInteraction.objects
        .filter(
            user=user, culture=culture,
            kind=StampInteraction.KIND_RECIPE_TRY,
            recipe__is_heritage=True,
        )
        .exclude(Q(recipe__video='') | Q(recipe__video__isnull=True))
        .exists()
    )


def compute_rarity(user, culture):
    """Rarity for any stamp the user holds in `culture` (#584).

    bronze:    first interaction.
    silver:    3+ interactions with the culture.
    gold:      7+ interactions including at least one saved story.
    emerald:   the user has contributed their own content about the culture.
    legendary: a tried heritage recipe with audio/video in the culture, or
               12+ interactions with it.
    """
    interactions = StampInteraction.objects.filter(user=user, culture=culture)
    count = interactions.count()

    if _has_heritage_video_interaction(user, culture) or count >= LEGENDARY_INTERACTION_THRESHOLD:
        return Stamp.RARITY_LEGENDARY
    if _user_contributed_to_culture(user, culture):
        return Stamp.RARITY_EMERALD
    has_story = interactions.filter(kind=StampInteraction.KIND_STORY_SAVE).exists()
    if count >= GOLD_THRESHOLD and has_story:
        return Stamp.RARITY_GOLD
    if count >= SILVER_THRESHOLD:
        return Stamp.RARITY_SILVER
    return Stamp.RARITY_BRONZE


def _apply_stamps_for_culture(user, culture, ensure_categories=(), source_recipe=None, source_story=None):
    """Create/upgrade the user's stamps for `culture` to the recomputed rarity.

    `ensure_categories` are created if missing. Existing stamps are upgraded
    in place, never downgraded; on upgrade `earned_at` is bumped. Returns
    (all_stamps, changed) where `changed` is a list of (stamp, rarity) for the
    stamps that were newly created or upgraded, for timeline events.
    """
    rarity = compute_rarity(user, culture)
    rank = Stamp.RARITY_RANK[rarity]
    changed = []

    for category in ensure_categories:
        stamp, created = Stamp.objects.get_or_create(
            user=user, culture=culture, category=category,
            defaults={
                'rarity': rarity,
                'source_recipe': source_recipe,
                'source_story': source_story,
            },
        )
        if created:
            changed.append((stamp, stamp.rarity))

    for stamp in Stamp.objects.filter(user=user, culture=culture):
        if Stamp.RARITY_RANK[stamp.rarity] < rank:
            stamp.rarity = rarity
            stamp.earned_at = timezone.now()
            stamp.save(update_fields=['rarity', 'earned_at'])
            if not any(s.pk == stamp.pk for s, _ in changed):
                changed.append((stamp, rarity))

    all_stamps = list(Stamp.objects.filter(user=user, culture=culture))
    return all_stamps, changed


# --------------------------------------------------------------------------
# Quests
# --------------------------------------------------------------------------

def active_quests(now=None):
    """Quests that are currently in play (non-event, or in their event window)."""
    now = now or timezone.now()
    return Quest.objects.filter(
        Q(is_event_quest=False)
        | Q(is_event_quest=True, event_start__lte=now, event_end__gte=now)
    )


def _quest_matches_action(quest, *, kind, culture, recipe, story):
    crit = quest.filter_criteria or {}
    region = crit.get('region')
    if region is not None and (culture or '').lower() != str(region).lower():
        return False
    action = crit.get('action')
    if action is not None and action != kind:
        return False
    if crit.get('heritage') and not (recipe is not None and recipe.is_heritage):
        return False
    return True


def _apply_quest_reward(user, quest):
    if quest.reward_type == Quest.REWARD_THEME and quest.reward_value:
        passport, _ = CulturalPassport.objects.get_or_create(user=user)
        passport.active_theme = quest.reward_value
        passport.save(update_fields=['active_theme', 'updated_at'])
    elif quest.reward_type == Quest.REWARD_STAMP:
        culture = quest.reward_value or quest.name
        Stamp.objects.get_or_create(
            user=user, culture=culture, category=Stamp.CATEGORY_COMMUNITY,
            defaults={'rarity': Stamp.RARITY_GOLD},
        )
    # REWARD_POINTS: no bonus beyond the standard quest-completion weight.


def update_quest_progress(user, *, kind, culture, recipe=None, story=None):
    """Bump matching quests for `user` after a passport action.

    Returns the list of UserQuest rows that became completed on this call so
    the caller can write timeline events.
    """
    now = timezone.now()
    newly_completed = []
    for quest in active_quests(now):
        if not _quest_matches_action(quest, kind=kind, culture=culture, recipe=recipe, story=story):
            continue
        user_quest, _ = UserQuest.objects.get_or_create(user=user, quest=quest)
        if user_quest.completed_at is not None:
            continue
        user_quest.progress += 1
        if user_quest.progress >= quest.target_count:
            user_quest.completed_at = now
            user_quest.reward_claimed = True
            user_quest.save(update_fields=['progress', 'completed_at', 'reward_claimed'])
            _apply_quest_reward(user, quest)
            PassportEvent.objects.create(
                user=user,
                event_type=PassportEvent.TYPE_QUEST_COMPLETED,
                description=f'Completed quest: {quest.name}',
                timestamp=now,
            )
            newly_completed.append(user_quest)
        else:
            user_quest.save(update_fields=['progress'])
    return newly_completed


# --------------------------------------------------------------------------
# Culture helpers
# --------------------------------------------------------------------------

def recipe_culture(recipe):
    return recipe.region.name if recipe.region_id else UNKNOWN_CULTURE


def story_culture(story):
    if story.region_id:
        return story.region.name
    link = story.recipe_links.select_related('recipe__region').first()
    if link and link.recipe.region_id:
        return link.recipe.region.name
    return UNKNOWN_CULTURE


# --------------------------------------------------------------------------
# Action recording (used by the try/ and save/ endpoints and signals)
# --------------------------------------------------------------------------

def _emit_stamp_events(user, changed):
    now = timezone.now()
    for stamp, rarity in changed:
        PassportEvent.objects.create(
            user=user,
            event_type=PassportEvent.TYPE_STAMP_EARNED,
            description=f'Earned a {rarity} stamp for {stamp.culture}',
            timestamp=now,
            related_recipe=stamp.source_recipe,
            related_story=stamp.source_story,
            stamp_rarity=rarity,
        )


def record_recipe_try(user, recipe):
    """Record that `user` tried `recipe` and run the full passport update.

    Idempotent: a repeat call for the same recipe is a no-op beyond returning
    the current state. Returns a dict with the affected stamps, any quests that
    just completed, and the level transition.
    """
    culture = recipe_culture(recipe)
    category = Stamp.CATEGORY_HERITAGE if recipe.is_heritage else Stamp.CATEGORY_RECIPE
    interaction, created = StampInteraction.objects.get_or_create(
        user=user, recipe=recipe,
        defaults={
            'culture': culture,
            'category': category,
            'kind': StampInteraction.KIND_RECIPE_TRY,
        },
    )
    if not created:
        return {
            'created': False,
            'culture': culture,
            'affected_stamps': list(Stamp.objects.filter(user=user, culture=culture)),
            'newly_completed_quests': [],
            'level': recalculate_passport_points(user),
        }

    now = timezone.now()
    PassportEvent.objects.create(
        user=user,
        event_type=PassportEvent.TYPE_RECIPE_TRIED,
        description=f'Tried recipe: {recipe.title}',
        timestamp=now,
        related_recipe=recipe,
    )
    stamps, changed = _apply_stamps_for_culture(
        user, culture, ensure_categories=[category], source_recipe=recipe,
    )
    _emit_stamp_events(user, changed)
    newly_completed = update_quest_progress(
        user, kind=StampInteraction.KIND_RECIPE_TRY, culture=culture, recipe=recipe,
    )
    level = recalculate_passport_points(user)
    return {
        'created': True,
        'culture': culture,
        'affected_stamps': stamps,
        'newly_completed_quests': newly_completed,
        'level': level,
    }


def record_story_save(user, story):
    """Record that `user` saved `story` and run the full passport update."""
    culture = story_culture(story)
    category = Stamp.CATEGORY_STORY
    interaction, created = StampInteraction.objects.get_or_create(
        user=user, story=story,
        defaults={
            'culture': culture,
            'category': category,
            'kind': StampInteraction.KIND_STORY_SAVE,
        },
    )
    if not created:
        return {
            'created': False,
            'culture': culture,
            'affected_stamps': list(Stamp.objects.filter(user=user, culture=culture)),
            'newly_completed_quests': [],
            'level': recalculate_passport_points(user),
        }

    now = timezone.now()
    PassportEvent.objects.create(
        user=user,
        event_type=PassportEvent.TYPE_STORY_SAVED,
        description=f'Saved story: {story.title}',
        timestamp=now,
        related_story=story,
    )
    stamps, changed = _apply_stamps_for_culture(
        user, culture, ensure_categories=[category], source_story=story,
    )
    _emit_stamp_events(user, changed)
    newly_completed = update_quest_progress(
        user, kind=StampInteraction.KIND_STORY_SAVE, culture=culture, story=story,
    )
    level = recalculate_passport_points(user)
    return {
        'created': True,
        'culture': culture,
        'affected_stamps': stamps,
        'newly_completed_quests': newly_completed,
        'level': level,
    }


def record_heritage_recipe_shared(recipe):
    """Signal hook: a heritage recipe was created (#587/#588).

    Writes a heritage_shared timeline event, grants/upgrades the author's
    heritage stamp for the recipe's culture, and recomputes points.
    """
    author = recipe.author
    culture = recipe_culture(recipe)
    PassportEvent.objects.create(
        user=author,
        event_type=PassportEvent.TYPE_HERITAGE_SHARED,
        description=f'Shared heritage recipe: {recipe.title}',
        timestamp=timezone.now(),
        related_recipe=recipe,
    )
    _, changed = _apply_stamps_for_culture(
        author, culture,
        ensure_categories=[Stamp.CATEGORY_HERITAGE],
        source_recipe=recipe,
    )
    _emit_stamp_events(author, changed)
    return recalculate_passport_points(author)


# --------------------------------------------------------------------------
# Read helpers used by serializers / quest endpoint
# --------------------------------------------------------------------------

def passport_stats(user):
    from apps.recipes.models import Recipe

    interactions = StampInteraction.objects.filter(user=user)
    return {
        'cultures_count': interactions.values('culture').distinct().count(),
        'recipes_tried': interactions.filter(kind=StampInteraction.KIND_RECIPE_TRY).count(),
        'stories_saved': interactions.filter(kind=StampInteraction.KIND_STORY_SAVE).count(),
        'heritage_shared': Recipe.objects.filter(author=user, is_heritage=True).count(),
    }


def culture_summaries(user):
    """Per-culture rollup for the passport response."""
    summaries = {}
    for interaction in StampInteraction.objects.filter(user=user):
        bucket = summaries.setdefault(
            interaction.culture,
            {'culture': interaction.culture, 'recipes_tried': 0, 'stories_saved': 0, 'interactions': 0, 'rarity': None},
        )
        bucket['interactions'] += 1
        if interaction.kind == StampInteraction.KIND_RECIPE_TRY:
            bucket['recipes_tried'] += 1
        elif interaction.kind == StampInteraction.KIND_STORY_SAVE:
            bucket['stories_saved'] += 1

    for stamp in Stamp.objects.filter(user=user):
        bucket = summaries.setdefault(
            stamp.culture,
            {'culture': stamp.culture, 'recipes_tried': 0, 'stories_saved': 0, 'interactions': 0, 'rarity': None},
        )
        current = bucket['rarity']
        if current is None or Stamp.RARITY_RANK[stamp.rarity] > Stamp.RARITY_RANK[current]:
            bucket['rarity'] = stamp.rarity

    return sorted(summaries.values(), key=lambda b: b['culture'])


def quests_with_progress(user, now=None):
    """Active quests annotated with this user's progress (no rows created)."""
    now = now or timezone.now()
    user_quests = {uq.quest_id: uq for uq in UserQuest.objects.filter(user=user)}
    result = []
    for quest in active_quests(now).order_by('id'):
        uq = user_quests.get(quest.id)
        result.append({
            'id': quest.id,
            'name': quest.name,
            'description': quest.description,
            'category': quest.category,
            'target_count': quest.target_count,
            'reward_type': quest.reward_type,
            'reward_value': quest.reward_value,
            'is_event_quest': quest.is_event_quest,
            'event_start': quest.event_start,
            'event_end': quest.event_end,
            'progress': uq.progress if uq else 0,
            'completed_at': uq.completed_at if uq else None,
            'reward_claimed': uq.reward_claimed if uq else False,
        })
    return result
