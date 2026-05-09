from rest_framework import serializers
from apps.recipes.models import Region


class RegionGeoSerializer(serializers.ModelSerializer):
    """Full region serializer including geo data and parent info.

    Used by /api/map/regions/ to provide everything the frontend
    needs to place pins and render region cards on a map.
    """
    parent_id   = serializers.IntegerField(source='parent.id', read_only=True, default=None)
    parent_name = serializers.CharField(source='parent.name', read_only=True, default=None)
    has_geo     = serializers.SerializerMethodField()

    class Meta:
        model = Region
        fields = [
            'id', 'name',
            'latitude', 'longitude',
            'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west',
            'parent_id', 'parent_name',
            'has_geo',
        ]

    def get_has_geo(self, obj):
        """True if the region has at least center coordinates set."""
        return obj.latitude is not None and obj.longitude is not None


class RegionGeoWithCountsSerializer(RegionGeoSerializer):
    """Extends RegionGeoSerializer with pre-annotated content counts.

    The view is responsible for annotating the queryset with
    `recipe_count`, `story_count`, and `cultural_count` before
    passing it to this serializer.
    """
    content_count = serializers.SerializerMethodField()

    class Meta(RegionGeoSerializer.Meta):
        fields = RegionGeoSerializer.Meta.fields + ['content_count']

    def get_content_count(self, obj):
        return {
            'recipes':          getattr(obj, 'recipe_count', 0),
            'stories':          getattr(obj, 'story_count', 0),
            'cultural_content': getattr(obj, 'cultural_count', 0),
        }


class MapRecipeCardSerializer(serializers.Serializer):
    """Compact recipe card for map discovery content listings."""
    content_type    = serializers.SerializerMethodField()
    id              = serializers.IntegerField()
    title           = serializers.CharField()
    description     = serializers.SerializerMethodField()
    image           = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username')
    region_name     = serializers.CharField(source='region.name', default=None)
    created_at      = serializers.DateTimeField()

    def get_content_type(self, obj):
        return 'recipe'

    def get_description(self, obj):
        return obj.description[:200] if obj.description else ''

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class MapStoryCardSerializer(serializers.Serializer):
    """Compact story card for map discovery content listings."""
    content_type    = serializers.SerializerMethodField()
    id              = serializers.IntegerField()
    title           = serializers.CharField()
    body            = serializers.SerializerMethodField()
    image           = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username')
    region_name     = serializers.SerializerMethodField()
    linked_recipe_id = serializers.SerializerMethodField()
    created_at      = serializers.DateTimeField()

    def get_content_type(self, obj):
        return 'story'

    def get_body(self, obj):
        return obj.body[:200] if obj.body else ''

    def get_image(self, obj):
        return obj.image.url if obj.image else None

    def get_region_name(self, obj):
        if obj.region_id:
            return obj.region.name
        
        first_link = obj.recipe_links.all()[0] if obj.recipe_links.all().exists() else None
        if first_link and first_link.recipe.region:
            return first_link.recipe.region.name
        return None

    def get_linked_recipe_id(self, obj):
        """Return first recipe's ID for backward compat."""
        first = obj.recipe_links.first()
        return first.recipe_id if first else None


class MapCulturalCardSerializer(serializers.Serializer):
    """Compact cultural content card for map discovery listings."""
    content_type = serializers.SerializerMethodField()
    id           = serializers.IntegerField()
    slug         = serializers.CharField()
    kind         = serializers.CharField()
    title        = serializers.CharField()
    body         = serializers.SerializerMethodField()
    region_name  = serializers.SerializerMethodField()

    def get_content_type(self, obj):
        return 'cultural'

    def get_body(self, obj):
        return obj.body[:200] if obj.body else ''

    def get_region_name(self, obj):
        if obj.region_id:
            return obj.region.name
        return obj.region_text or None
