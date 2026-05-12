from rest_framework import serializers
from .models import Story, StoryRecipeLink, StoryComment, StoryVote
from apps.recipes.models import DietaryTag, EventTag, Religion
from apps.recipes.serializers import (
    DietaryTagLookupSerializer, EventTagLookupSerializer, ReligionLookupSerializer
)


class StoryRecipeLinkSerializer(serializers.ModelSerializer):
    """Read-only serializer for a recipe within a story."""
    recipe_id = serializers.IntegerField(source='recipe.id')
    recipe_title = serializers.CharField(source='recipe.title')

    class Meta:
        model = StoryRecipeLink
        fields = ['recipe_id', 'recipe_title', 'order']


class StorySerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_display_name = serializers.ReadOnlyField(source='author.display_name')
    author_avatar_url = serializers.SerializerMethodField()
    
    # --- BACKWARD COMPAT: old single-value fields ---
    linked_recipe = serializers.SerializerMethodField()    # read: first recipe ID or null
    recipe_title = serializers.SerializerMethodField()     # read: first recipe title or null
    
    # --- NEW: full array ---
    linked_recipes = StoryRecipeLinkSerializer(
        source='recipe_links', many=True, read_only=True
    )
    
    # --- WRITE fields ---
    linked_recipe_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    linked_recipe_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    
    # --- TAXONOMY (M5-20 / #386) ---
    dietary_tags = DietaryTagLookupSerializer(many=True, read_only=True)
    event_tags = EventTagLookupSerializer(many=True, read_only=True)
    religions = ReligionLookupSerializer(many=True, read_only=True)
    
    dietary_tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=DietaryTag.objects.all(), source='dietary_tags',
        many=True, write_only=True, required=False
    )
    event_tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=EventTag.objects.all(), source='event_tags',
        many=True, write_only=True, required=False
    )
    religion_ids = serializers.PrimaryKeyRelatedField(
        queryset=Religion.objects.all(), source='religions',
        many=True, write_only=True, required=False
    )

    # Expose region name for frontend display (string, not FK id)
    region_name = serializers.SerializerMethodField()

    rank_score = serializers.SerializerMethodField()
    rank_reason = serializers.SerializerMethodField()
    heritage_group = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = [
            'id', 'public_id', 'title', 'summary', 'body', 'image', 'author', 'author_username',
            'author_display_name', 'author_avatar_url',
            'linked_recipe', 'recipe_title',    # backward compat (read)
            'linked_recipes',                   # new array (read)
            'linked_recipe_id', 'linked_recipe_ids',  # write aliases
            'dietary_tags', 'event_tags', 'religions',
            'dietary_tag_ids', 'event_tag_ids', 'religion_ids',
            'language', 'region', 'region_name',
            'latitude', 'longitude',
            'story_type',
            'is_published', 'created_at', 'updated_at',
            'rank_score', 'rank_reason',
            'heritage_group',
        ]
        read_only_fields = ['public_id', 'author', 'created_at', 'updated_at']

    def get_heritage_group(self, obj):
        # Most recent membership wins. GenericRelation prefetch keeps this
        # cheap for list responses.
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

    def get_author_avatar_url(self, obj):
        if not obj.author or not obj.author.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.author.avatar.url)
        return obj.author.avatar.url

    def to_internal_value(self, data):
        """Shim to handle legacy 'linked_recipe' as 'linked_recipe_id'."""
        if 'linked_recipe' in data and 'linked_recipe_id' not in data:
            if hasattr(data, 'copy'):
                data = data.copy()
            val = data.get('linked_recipe')
            # Handle list-wrapped values from QueryDict or some frontend libs
            if isinstance(val, list) and len(val) > 0:
                data['linked_recipe_id'] = val[0]
            else:
                data['linked_recipe_id'] = val
            # Use pop to remove the legacy key
            if 'linked_recipe' in data:
                if hasattr(data, 'pop'):
                    data.pop('linked_recipe')
        return super().to_internal_value(data)

    def _first_link(self, obj):
        """Helper to read the first link from the prefetch cache."""
        links = list(obj.recipe_links.all())
        return links[0] if links else None

    def get_linked_recipe(self, obj):
        """Return first recipe's ID for backward compat."""
        first = self._first_link(obj)
        return first.recipe_id if first else None

    def get_recipe_title(self, obj):
        """Return first recipe's title for backward compat."""
        first = self._first_link(obj)
        return first.recipe.title if first else None

    def get_region_name(self, obj):
        """Return the effective region name: direct region > first linked_recipe's region."""
        if obj.region_id:
            return obj.region.name
        
        first = self._first_link(obj)
        if first and first.recipe.region:
            return first.recipe.region.name
        return None

    def create(self, validated_data):
        single_id = validated_data.pop('linked_recipe_id', None)
        multi_ids = validated_data.pop('linked_recipe_ids', None)
        
        dietary_tags = validated_data.pop('dietary_tags', None)
        event_tags = validated_data.pop('event_tags', None)
        religions = validated_data.pop('religions', None)
        
        story = Story.objects.create(**validated_data)
        self._set_recipes(story, single_id, multi_ids)
        
        if dietary_tags is not None:
            story.dietary_tags.set(dietary_tags)
        if event_tags is not None:
            story.event_tags.set(event_tags)
        if religions is not None:
            story.religions.set(religions)
            
        return story

    def update(self, instance, validated_data):
        single_id = validated_data.pop('linked_recipe_id', None)
        multi_ids = validated_data.pop('linked_recipe_ids', None)
        
        dietary_tags = validated_data.pop('dietary_tags', None)
        event_tags = validated_data.pop('event_tags', None)
        religions = validated_data.pop('religions', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if single_id is not None or multi_ids is not None:
            self._set_recipes(instance, single_id, multi_ids)
            
        if dietary_tags is not None:
            instance.dietary_tags.set(dietary_tags)
        if event_tags is not None:
            instance.event_tags.set(event_tags)
        if religions is not None:
            instance.religions.set(religions)
            
        return instance

    def _set_recipes(self, story, single_id, multi_ids):
        recipe_ids = []
        if multi_ids is not None:
            recipe_ids = multi_ids
        elif single_id is not None:
            recipe_ids = [single_id]

        # Replace existing links
        story.recipe_links.all().delete()
        for i, rid in enumerate(recipe_ids):
            StoryRecipeLink.objects.create(story=story, recipe_id=rid, order=i)


class StoryCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_display_name = serializers.ReadOnlyField(source='author.display_name')
    author_avatar_url = serializers.SerializerMethodField()
    helpful_count = serializers.IntegerField(read_only=True, default=0)
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = StoryComment
        fields = [
            'id', 'story', 'author', 'author_username', 'author_display_name', 'author_avatar_url',
            'parent_comment', 'body', 'type', 'created_at', 'updated_at', 'helpful_count', 'has_voted',
        ]
        read_only_fields = ['story', 'author', 'created_at', 'updated_at']

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if hasattr(obj, 'user_has_voted'):
                return obj.user_has_voted
            return obj.votes.filter(user=request.user).exists()
        return False

    def get_author_avatar_url(self, obj):
        if not obj.author or not obj.author.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.author.avatar.url)
        return obj.author.avatar.url

    def validate(self, attrs):
        parent = attrs.get('parent_comment')
        story = self.context.get('story')
        if parent and story and parent.story_id != story.id:
            raise serializers.ValidationError({'parent_comment': 'Must belong to the same story.'})
        return attrs
