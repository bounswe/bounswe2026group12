from django.conf import settings
from django.db import models


class CulturalPassport(models.Model):
    """Gamified profile companion (#583).

    Every user has exactly one passport row, auto-created on signup via a
    post_save signal. Stamps (#584), Quests (#586), timeline events (#588)
    and the points/level computation (#587) all hang off this shell.
    """

    LEVEL_CHOICES = [(i, f"Level {i}") for i in range(1, 7)]
    DEFAULT_THEME = 'classic_traveler'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport',
    )
    level = models.IntegerField(choices=LEVEL_CHOICES, default=1)
    total_points = models.IntegerField(default=0)
    active_theme = models.CharField(max_length=64, default=DEFAULT_THEME)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cultural_passports'

    def __str__(self):
        return f'Passport(user={self.user.username}, level={self.level})'


class Stamp(models.Model):
    """A culture stamp a user has earned (#584).

    Identity is (user, culture, category): a user holds at most one stamp per
    culture per category, and it is upgraded in place rather than duplicated.
    Rarity is recomputed from how deeply the user has engaged with the culture
    (see apps.passport.services.compute_rarity); all of a user's stamps for a
    given culture therefore share the same rarity, the category just records
    how the stamp was first earned. `earned_at` is set on create and bumped
    whenever the stamp is upgraded to a higher rarity.
    """

    CATEGORY_RECIPE = 'recipe'
    CATEGORY_STORY = 'story'
    CATEGORY_HERITAGE = 'heritage'
    CATEGORY_EXPLORATION = 'exploration'
    CATEGORY_COMMUNITY = 'community'
    CATEGORY_CHOICES = [
        (CATEGORY_RECIPE, 'Recipe'),
        (CATEGORY_STORY, 'Story'),
        (CATEGORY_HERITAGE, 'Heritage'),
        (CATEGORY_EXPLORATION, 'Exploration'),
        (CATEGORY_COMMUNITY, 'Community'),
    ]

    RARITY_BRONZE = 'bronze'
    RARITY_SILVER = 'silver'
    RARITY_GOLD = 'gold'
    RARITY_EMERALD = 'emerald'
    RARITY_LEGENDARY = 'legendary'
    RARITY_CHOICES = [
        (RARITY_BRONZE, 'Bronze'),
        (RARITY_SILVER, 'Silver'),
        (RARITY_GOLD, 'Gold'),
        (RARITY_EMERALD, 'Emerald'),
        (RARITY_LEGENDARY, 'Legendary'),
    ]
    # Ascending rank, used to decide whether a recompute is an upgrade.
    RARITY_RANK = {
        RARITY_BRONZE: 0,
        RARITY_SILVER: 1,
        RARITY_GOLD: 2,
        RARITY_EMERALD: 3,
        RARITY_LEGENDARY: 4,
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport_stamps',
    )
    culture = models.CharField(
        max_length=120,
        help_text='Region/cuisine identifier, aligned with Region.name.',
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    rarity = models.CharField(
        max_length=20, choices=RARITY_CHOICES, default=RARITY_BRONZE,
    )
    earned_at = models.DateTimeField(auto_now_add=True)
    source_recipe = models.ForeignKey(
        'recipes.Recipe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    source_story = models.ForeignKey(
        'stories.Story', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )

    class Meta:
        db_table = 'passport_stamps'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'culture', 'category'],
                name='uniq_stamp_user_culture_category',
            ),
        ]
        ordering = ['-earned_at']

    def __str__(self):
        return f'Stamp({self.user.username}, {self.culture}/{self.category}, {self.rarity})'


class StampInteraction(models.Model):
    """One deduplicated passport interaction backing the stamp computation.

    A row per (user, recipe) or (user, story) the user has tried/saved. The
    conditional unique constraints make re-trying the same recipe a no-op, so
    counting these rows gives an idempotent interaction count per culture.
    """

    KIND_RECIPE_TRY = 'recipe_try'
    KIND_STORY_SAVE = 'story_save'
    KIND_CHOICES = [
        (KIND_RECIPE_TRY, 'Recipe tried'),
        (KIND_STORY_SAVE, 'Story saved'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport_interactions',
    )
    culture = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=Stamp.CATEGORY_CHOICES)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    recipe = models.ForeignKey(
        'recipes.Recipe', on_delete=models.CASCADE, null=True, blank=True,
        related_name='+',
    )
    story = models.ForeignKey(
        'stories.Story', on_delete=models.CASCADE, null=True, blank=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'passport_stamp_interactions'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'recipe'],
                condition=models.Q(recipe__isnull=False),
                name='uniq_stamp_interaction_user_recipe',
            ),
            models.UniqueConstraint(
                fields=['user', 'story'],
                condition=models.Q(story__isnull=False),
                name='uniq_stamp_interaction_user_story',
            ),
        ]

    def __str__(self):
        return f'StampInteraction({self.user.username}, {self.kind}, {self.culture})'


class Quest(models.Model):
    """An authored challenge with a target count and a reward (#586).

    Quest content is created in the Django admin; the table ships empty.
    `filter_criteria` is matched against passport actions, e.g.
    {"region": "mediterranean"} or {"action": "story_save"} or
    {"heritage": true}. A "count" key inside filter_criteria is informational
    only, completion always uses `target_count`.
    """

    CATEGORY_DISCOVERY = 'discovery'
    CATEGORY_HERITAGE = 'heritage'
    CATEGORY_JOURNEY = 'journey'
    CATEGORY_COMMUNITY = 'community'
    CATEGORY_CHOICES = [
        (CATEGORY_DISCOVERY, 'Discovery'),
        (CATEGORY_HERITAGE, 'Heritage'),
        (CATEGORY_JOURNEY, 'Journey'),
        (CATEGORY_COMMUNITY, 'Community'),
    ]

    REWARD_STAMP = 'stamp'
    REWARD_THEME = 'theme'
    REWARD_POINTS = 'points'
    REWARD_CHOICES = [
        (REWARD_STAMP, 'Stamp'),
        (REWARD_THEME, 'Theme'),
        (REWARD_POINTS, 'Points'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    target_count = models.IntegerField(default=1)
    filter_criteria = models.JSONField(default=dict, blank=True)
    reward_type = models.CharField(max_length=20, choices=REWARD_CHOICES)
    reward_value = models.CharField(max_length=120, blank=True, default='')
    is_event_quest = models.BooleanField(default=False)
    event_start = models.DateTimeField(null=True, blank=True)
    event_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'passport_quests'

    def __str__(self):
        return f'Quest({self.name})'


class UserQuest(models.Model):
    """A user's progress against a Quest (#586)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport_user_quests',
    )
    quest = models.ForeignKey(
        Quest, on_delete=models.CASCADE, related_name='user_quests',
    )
    progress = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    # Set when the reward has been applied. Rewards are applied automatically
    # on completion, so this flips to True at the same time as completed_at.
    reward_claimed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'passport_user_quests'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'quest'], name='uniq_user_quest',
            ),
        ]

    def __str__(self):
        return f'UserQuest({self.user.username}, {self.quest.name}, {self.progress}/{self.quest.target_count})'


class PassportEvent(models.Model):
    """A timeline entry for a passport-relevant thing that happened (#588)."""

    TYPE_RECIPE_TRIED = 'recipe_tried'
    TYPE_STORY_SAVED = 'story_saved'
    TYPE_STAMP_EARNED = 'stamp_earned'
    TYPE_QUEST_COMPLETED = 'quest_completed'
    TYPE_HERITAGE_SHARED = 'heritage_shared'
    TYPE_LEVEL_UP = 'level_up'
    TYPE_CHOICES = [
        (TYPE_RECIPE_TRIED, 'Recipe tried'),
        (TYPE_STORY_SAVED, 'Story saved'),
        (TYPE_STAMP_EARNED, 'Stamp earned'),
        (TYPE_QUEST_COMPLETED, 'Quest completed'),
        (TYPE_HERITAGE_SHARED, 'Heritage shared'),
        (TYPE_LEVEL_UP, 'Level up'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport_events',
    )
    event_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255)
    timestamp = models.DateTimeField()
    related_recipe = models.ForeignKey(
        'recipes.Recipe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    related_story = models.ForeignKey(
        'stories.Story', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    stamp_rarity = models.CharField(
        max_length=20, choices=Stamp.RARITY_CHOICES, null=True, blank=True,
    )

    class Meta:
        db_table = 'passport_events'
        ordering = ['-timestamp', '-id']

    def __str__(self):
        return f'PassportEvent({self.user.username}, {self.event_type})'
