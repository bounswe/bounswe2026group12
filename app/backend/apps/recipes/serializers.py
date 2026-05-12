from rest_framework import serializers
from .models import (
    Recipe, Ingredient, Unit, RecipeIngredient, Region, Comment,
    DietaryTag, EventTag, Religion, IngredientSubstitution,
    EndangeredNote, RecipeCulturalContext, IngredientRoute, Bookmark
)


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = [
            'id', 'name', 'is_approved',
            'latitude', 'longitude',
            'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west',
            'parent',
        ]


class RegionSubmissionSerializer(serializers.ModelSerializer):
    """Write serializer for user-submitted regions (#391).

    Only `name` is settable on submission; geo metadata stays admin-only.
    Dedup is enforced at the viewset layer so we can return 409 for approved
    duplicates and 200 for already-queued submissions instead of a flat 400.
    """

    class Meta:
        model = Region
        fields = ['id', 'name', 'is_approved']
        read_only_fields = ['id']

    def validate_name(self, value):
        cleaned_value = value.strip() if isinstance(value, str) else ''
        if not cleaned_value:
            raise serializers.ValidationError('This field may not be blank.')
        return cleaned_value

    def validate(self, data):
        request = self.context.get('request')
        if 'is_approved' in data:
            if not request or not request.user or not request.user.is_staff:
                data.pop('is_approved')
        return data

class IngredientLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ['id', 'name', 'heritage_status']

class NamedSubmissionSerializer(serializers.ModelSerializer):
    duplicate_message = 'This name already exists.'

    # Audit-trail fields exposed in the response but locked against client
    # spoofing on submission. Set server-side via the viewset.
    AUDIT_READ_ONLY_FIELDS = (
        'submitted_by', 'submitted_at',
        'reviewed_by', 'reviewed_at',
        'rejection_reason',
    )

    def validate_name(self, value):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise serializers.ValidationError('This field may not be blank.')

        duplicate_queryset = self.Meta.model.objects.filter(name__iexact=cleaned_value)
        if self.instance is not None:
            duplicate_queryset = duplicate_queryset.exclude(pk=self.instance.pk)

        if duplicate_queryset.exists():
            raise serializers.ValidationError(self.duplicate_message)

        return cleaned_value

    def validate(self, data):
        request = self.context.get('request')
        if 'is_approved' in data:
            if not request or not request.user or not request.user.is_staff:
                data.pop('is_approved')
        return data

class IngredientSerializer(NamedSubmissionSerializer):
    duplicate_message = 'An ingredient with this name already exists.'

    class Meta:
        model = Ingredient
        fields = [
            'id', 'name', 'is_approved', 'heritage_status', 'density_g_per_ml',
            'submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at', 'rejection_reason'
        ]
        read_only_fields = NamedSubmissionSerializer.AUDIT_READ_ONLY_FIELDS

class UnitLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'name']

class UnitSerializer(NamedSubmissionSerializer):
    duplicate_message = 'A unit with this name already exists.'

    class Meta:
        model = Unit
        fields = '__all__'
        read_only_fields = NamedSubmissionSerializer.AUDIT_READ_ONLY_FIELDS


class DietaryTagLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietaryTag
        fields = ['id', 'name']


class DietaryTagSerializer(NamedSubmissionSerializer):
    duplicate_message = 'A dietary tag with this name already exists.'

    class Meta:
        model = DietaryTag
        fields = '__all__'
        read_only_fields = NamedSubmissionSerializer.AUDIT_READ_ONLY_FIELDS


class EventTagLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTag
        fields = ['id', 'name']


class EventTagSerializer(NamedSubmissionSerializer):
    duplicate_message = 'An event tag with this name already exists.'

    class Meta:
        model = EventTag
        fields = '__all__'

class ReligionLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Religion
        fields = ['id', 'name']

class ReligionSerializer(NamedSubmissionSerializer):
    duplicate_message = 'A religion with this name already exists.'

    class Meta:
        model = Religion
        fields = '__all__'


class ConvertRequestSerializer(serializers.Serializer):
    """Input shape for POST /api/convert/."""

    amount = serializers.DecimalField(max_digits=14, decimal_places=6, min_value=0)
    from_unit = serializers.CharField(max_length=50)
    to_unit = serializers.CharField(max_length=50)
    ingredient_id = serializers.IntegerField(required=False, allow_null=True)

class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')
    unit_name = serializers.ReadOnlyField(source='unit.name')

    class Meta:
        model = RecipeIngredient
        fields = ['id', 'ingredient', 'ingredient_name', 'amount', 'unit', 'unit_name']

class RecipeIngredientWriteSerializer(serializers.Serializer):
    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), required=False, allow_null=True)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be a positive number.")
        return value

class CulturalContextSerializer(serializers.ModelSerializer):
    """The seven "Beyond the Recipe" narrative notes (#521)."""
    class Meta:
        model = RecipeCulturalContext
        fields = [
            'identity_note', 'memory_note', 'migration_note', 'ritual_note',
            'commensality_note', 'terroir_note', 'craft_note',
        ]

class EndangeredNoteSerializer(serializers.ModelSerializer):
    """Sourced note attached to a recipe's endangered-heritage status (#524)."""

    class Meta:
        model = EndangeredNote
        fields = ['id', 'recipe', 'text', 'source_url', 'created_at']
        read_only_fields = ['id', 'recipe', 'created_at']


class RecipeSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    region_name = serializers.ReadOnlyField(source='region.name')
    ingredients = RecipeIngredientSerializer(source='recipe_ingredients', many=True, read_only=True)
    ingredients_write = RecipeIngredientWriteSerializer(many=True, write_only=True, required=False)
    dietary_tags = DietaryTagLookupSerializer(many=True, read_only=True)
    event_tags = EventTagLookupSerializer(many=True, read_only=True)
    religions = ReligionLookupSerializer(many=True, read_only=True)
    endangered_notes = EndangeredNoteSerializer(many=True, read_only=True)
    dietary_tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=DietaryTag.objects.all(), source='dietary_tags',
        many=True, write_only=True, required=False,
    )
    event_tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=EventTag.objects.all(), source='event_tags',
        many=True, write_only=True, required=False,
    )
    religion_ids = serializers.PrimaryKeyRelatedField(
        queryset=Religion.objects.all(), source='religions',
        many=True, write_only=True, required=False,
    )
    story_count = serializers.IntegerField(read_only=True, default=0)
    rank_score = serializers.SerializerMethodField()
    rank_reason = serializers.SerializerMethodField()
    heritage_group = serializers.SerializerMethodField()
    cultural_context = CulturalContextSerializer(required=False, allow_null=True)
    is_bookmarked = serializers.BooleanField(read_only=True, allow_null=True)
    bookmark_count = serializers.IntegerField(read_only=True, default=0)
    user_rating = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            'id', 'public_id', 'title', 'description', 'steps', 'image', 'video',
            'region', 'region_name', 'latitude', 'longitude',
            'author', 'author_username', 'qa_enabled',
            'is_published', 'is_heritage', 'heritage_notes', 'heritage_status',
            'average_rating', 'rating_count', 'user_rating',
            'created_at', 'updated_at',
            'ingredients', 'ingredients_write',
            'dietary_tags', 'event_tags', 'religions',
            'dietary_tag_ids', 'event_tag_ids', 'religion_ids',
            'cultural_context',
            'story_count',
            'rank_score', 'rank_reason',
            'heritage_group', 'endangered_notes',
            'is_bookmarked', 'bookmark_count'
        ]
        read_only_fields = ['public_id', 'author', 'created_at', 'updated_at']


    def get_heritage_group(self, obj):
        # Most recent membership wins. The GenericRelation prefetch covers
        # this in bulk so we don't fan out per row.
        memberships = list(obj.heritage_memberships.all())
        if not memberships:
            return None
        memberships.sort(key=lambda m: m.created_at, reverse=True)
        group = memberships[0].heritage_group
        return {'id': group.id, 'name': group.name}

    def get_rank_score(self, obj):
        return getattr(obj, 'rank_score', 0)

    def get_rank_reason(self, obj):
        return getattr(obj, 'rank_reason', None)

    def get_user_rating(self, obj):
        return getattr(obj, 'user_rating', None)

    def validate(self, data):
        if self.context['request'].method == 'POST':
            if not data.get('ingredients_write'):
                raise serializers.ValidationError({"ingredients_write": "At least one ingredient is required."})
        return data

    def _save_cultural_context(self, recipe, cultural_data):
        # cultural_data is the validated nested payload, or None when the
        # caller omitted it (PATCH) or sent it explicitly null. We only
        # create-or-update when a dict was provided.
        if not cultural_data:
            return
        context, _ = RecipeCulturalContext.objects.update_or_create(
            recipe=recipe, defaults=cultural_data,
        )
        # Refresh the cached reverse relation so the serialized response
        # reflects the write even when the recipe was loaded with
        # select_related('cultural_context').
        recipe.cultural_context = context

    def create(self, validated_data):
        ingredients_data = validated_data.pop('ingredients_write', [])
        dietary_tags = validated_data.pop('dietary_tags', None)
        event_tags = validated_data.pop('event_tags', None)
        religions = validated_data.pop('religions', None)
        cultural_data = validated_data.pop('cultural_context', None)
        recipe = Recipe.objects.create(**validated_data)
        for item in ingredients_data:
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=item['ingredient'],
                amount=item['amount'],
                unit=item.get('unit'),
            )
        if dietary_tags is not None:
            recipe.dietary_tags.set(dietary_tags)
        if event_tags is not None:
            recipe.event_tags.set(event_tags)
        if religions is not None:
            recipe.religions.set(religions)
        self._save_cultural_context(recipe, cultural_data)
        return recipe

    def update(self, instance, validated_data):
        ingredients_data = validated_data.pop('ingredients_write', None)
        dietary_tags = validated_data.pop('dietary_tags', None)
        event_tags = validated_data.pop('event_tags', None)
        religions = validated_data.pop('religions', None)
        cultural_data = validated_data.pop('cultural_context', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if ingredients_data is not None:
            instance.recipe_ingredients.all().delete()
            for item in ingredients_data:
                RecipeIngredient.objects.create(
                    recipe=instance,
                    ingredient=item['ingredient'],
                    amount=item['amount'],
                    unit=item.get('unit'),
                )
        if dietary_tags is not None:
            instance.dietary_tags.set(dietary_tags)
        if event_tags is not None:
            instance.event_tags.set(event_tags)
        if religions is not None:
            instance.religions.set(religions)
        self._save_cultural_context(instance, cultural_data)
        return instance

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    helpful_count = serializers.IntegerField(read_only=True, default=0)
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'recipe', 'author', 'author_username', 'parent_comment',
            'body', 'type', 'created_at', 'updated_at', 'helpful_count', 'has_voted'
        ]
        read_only_fields = ['recipe', 'author', 'created_at', 'updated_at']

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if hasattr(obj, 'user_has_voted'):
                return obj.user_has_voted
            # Fallback if not annotated
            return obj.votes.filter(user=request.user).exists()
        return False

    def validate(self, attrs):
        parent = attrs.get('parent_comment')
        recipe = self.context.get('recipe')
        if parent and recipe and parent.recipe_id != recipe.id:
            raise serializers.ValidationError({'parent_comment': 'Must belong to the same recipe.'})
        return attrs


class RecipeRatingWriteSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=1, max_value=5)


class RecipeRatingSummarySerializer(serializers.Serializer):
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, allow_null=True)
    rating_count = serializers.IntegerField()
    user_rating = serializers.IntegerField(allow_null=True)


class IngredientSubstituteSerializer(serializers.Serializer):
    """One row of substitution output: the target ingredient + ranking + notes."""
    id = serializers.IntegerField(source='to_ingredient.id', read_only=True)
    name = serializers.CharField(source='to_ingredient.name', read_only=True)
    closeness = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    notes = serializers.CharField(read_only=True)


class IngredientRouteSerializer(serializers.ModelSerializer):
    """Read/write shape for ingredient migration routes."""

    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')

    class Meta:
        model = IngredientRoute
        fields = [
            'id', 'ingredient', 'ingredient_name', 'waypoints',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
