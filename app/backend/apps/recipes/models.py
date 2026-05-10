from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django.conf import settings
from apps.common.ids import generate_ulid, validate_ulid

class CulturalModerationMixin(models.Model):
    """Audit fields for moderated lookup submissions.

    Originally introduced for cultural tags (#391); now also applied to
    Ingredient, Unit, and DietaryTag (#361) so the same admin queue and
    audit trail covers every user-submittable lookup.

    submitted_*: who created the record and when.
    reviewed_*: who approved or rejected it and when.
    rejection_reason: free text shown back to the submitter on reject.

    Fields are nullable / blank so legacy rows (created before this mixin)
    keep working; new submissions populate submitted_by + submitted_at.
    """
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    submitted_at = models.DateTimeField(auto_now_add=True, null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')

    class Meta:
        abstract = True


class Region(CulturalModerationMixin, models.Model):
    """Region model for tagging recipes and user origin.

    Extended for map discovery (#381) with geographic center coordinates,
    an optional bounding box, and an optional parent for single-level hierarchy
    (e.g., "Aegean Coast" → parent "Turkey").

    Plain FloatFields are used instead of PostGIS PointField because the
    region table is small (tens of rows) and simple float comparisons are
    sufficient for bounding-box queries without adding a geo dependency.

    Now user-submittable behind moderation (#391). Existing seeded rows are
    backfilled to is_approved=True via data migration.
    """
    name = models.CharField(max_length=100, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    # Geographic center — used for map pin placement
    latitude  = models.FloatField(null=True, blank=True, help_text='Center latitude of the region.')
    longitude = models.FloatField(null=True, blank=True, help_text='Center longitude of the region.')

    # Optional bounding box — enables rectangle-bounded viewport queries
    bbox_north = models.FloatField(null=True, blank=True, help_text='Northern latitude bound.')
    bbox_south = models.FloatField(null=True, blank=True, help_text='Southern latitude bound.')
    bbox_east  = models.FloatField(null=True, blank=True, help_text='Eastern longitude bound.')
    bbox_west  = models.FloatField(null=True, blank=True, help_text='Western longitude bound.')

    # Optional single-level hierarchy (e.g., "Aegean Coast" → parent "Turkey")
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='children',
        help_text='Optional parent region for hierarchical grouping.',
    )

    def __str__(self):
        return self.name

class Ingredient(CulturalModerationMixin, models.Model):
    """Ingredient model for reuse across recipes. User-submittable, moderated (#361)."""
    name = models.CharField(max_length=200, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')
    density_g_per_ml = models.DecimalField(
        max_digits=8, decimal_places=4,
        null=True, blank=True,
        help_text='g per ml. Required for mass to volume conversions. See apps/recipes/conversions/references.md for cited sources.',
    )

    def __str__(self):
        return self.name

class Unit(CulturalModerationMixin, models.Model):
    """Unit of measurement (e.g., grams, liters, cups). User-submittable, moderated (#361)."""
    name = models.CharField(max_length=50, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class DietaryTag(CulturalModerationMixin, models.Model):
    """Dietary tag (e.g., Vegan, Gluten-free, Halal). User-submittable, moderated (#361)."""
    name = models.CharField(max_length=100, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class EventTag(CulturalModerationMixin, models.Model):
    """Event tag (e.g., Wedding, Ramadan, Birthday). User-submittable, moderated."""
    name = models.CharField(max_length=100, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class Religion(CulturalModerationMixin, models.Model):
    """Religion model (e.g., Islam, Christianity, Judaism). User-submittable, moderated."""
    name = models.CharField(max_length=100, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class Recipe(models.Model):
    """Core Recipe model."""
    public_id = models.CharField(
        max_length=26,
        unique=True,
        editable=False,
        default=generate_ulid,
        validators=[validate_ulid],
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    image = models.ImageField(upload_to='recipes/images/', null=True, blank=True)
    video = models.FileField(upload_to='recipes/videos/', null=True, blank=True)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, related_name='recipes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recipes')
    qa_enabled = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    dietary_tags = models.ManyToManyField(DietaryTag, blank=True, related_name='recipes')
    event_tags = models.ManyToManyField(EventTag, blank=True, related_name='recipes')
    religions = models.ManyToManyField(Religion, blank=True, related_name='recipes')
    # Reverse generic relation to HeritageGroupMembership (#499). Virtual
    # field; no extra column on Recipe. Used for prefetch and serializer
    # lookup of the recipe's heritage group.
    heritage_memberships = GenericRelation(
        'heritage.HeritageGroupMembership',
        related_query_name='recipe',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class RecipeIngredient(models.Model):
    """Through model linking recipes and ingredients with amounts and units."""
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.amount} {self.unit} of {self.ingredient} in {self.recipe}"

class IngredientSubstitution(models.Model):
    """Directed substitution edge between two ingredients, typed by match category."""
    class MatchType(models.TextChoices):
        FLAVOR = 'flavor', 'Flavor'
        TEXTURE = 'texture', 'Texture'
        CHEMICAL = 'chemical', 'Chemical'

    from_ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name='outgoing_substitutions',
    )
    to_ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name='incoming_substitutions',
    )
    match_type = models.CharField(max_length=10, choices=MatchType.choices)
    closeness = models.DecimalField(max_digits=3, decimal_places=2)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_ingredient', 'to_ingredient', 'match_type')
        constraints = [
            models.CheckConstraint(
                condition=models.Q(closeness__gte=0) & models.Q(closeness__lte=1),
                name='substitution_closeness_range',
            ),
            models.CheckConstraint(
                condition=~models.Q(from_ingredient=models.F('to_ingredient')),
                name='substitution_no_self_loop',
            ),
        ]

    def __str__(self):
        return f"{self.from_ingredient} → {self.to_ingredient} ({self.match_type})"

class IngredientCheckOff(models.Model):
    """Server-persisted ingredient check-off per (user, recipe, ingredient) (#529).

    Backs the cooking-mode "I have this" toggle on web (#437) and mobile (#372)
    so checks survive reload and sync across devices, and so downstream features
    (substitution suggestions #371, shopping list #373) can read a single source
    of truth for what the user already has on hand.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ingredient_checkoffs',
    )
    recipe = models.ForeignKey(
        'Recipe',
        on_delete=models.CASCADE,
        related_name='checkoffs',
    )
    ingredient = models.ForeignKey(
        'Ingredient',
        on_delete=models.CASCADE,
        related_name='checkoffs',
    )
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'recipe', 'ingredient'],
                name='unique_checkoff_per_user_recipe_ingredient',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'recipe']),
        ]

    def __str__(self):
        return f"{self.user} checked {self.ingredient} in {self.recipe}"


class Comment(models.Model):
    """Comment or Question on a Recipe."""
    COMMENT_TYPES = (
        ('COMMENT', 'Comment'),
        ('QUESTION', 'Question'),
    )

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recipe_comments')
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    body = models.TextField()
    type = models.CharField(max_length=10, choices=COMMENT_TYPES, default='COMMENT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_type_display()} by {self.author.username} on {self.recipe.title}"

class Vote(models.Model):
    """Vote on a Comment/Question/Reply indicating it was helpful."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='votes')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='votes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'comment')

    def __str__(self):
        return f"Vote by {self.user.username} on Comment {self.comment.id}"
