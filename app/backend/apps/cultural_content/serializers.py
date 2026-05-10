from rest_framework import serializers

from apps.recipes.models import Recipe, Region

from .models import CulturalContent, CulturalEvent, CulturalEventRecipe


class CulturalContentCardSerializer(serializers.ModelSerializer):
    """Serializes CulturalContent to the shape consumed by the mobile/web cards.

    The `region` field is output as a plain string (region name) to preserve
    backward compatibility with existing frontend consumers. The backend stores
    it as a FK internally (added in #381), but consumers see no change.
    """

    id = serializers.SerializerMethodField()
    link = serializers.SerializerMethodField()
    # Output region as a string name for backward compatibility.
    # Internally region is now a FK; SlugRelatedField serialises it to name.
    region = serializers.SerializerMethodField()

    class Meta:
        model = CulturalContent
        fields = ['id', 'kind', 'title', 'body', 'region', 'link']

    def get_id(self, obj):
        return f'dc-{obj.kind}-{obj.id}'

    def get_link(self, obj):
        if obj.link_kind and obj.link_id:
            return {'kind': obj.link_kind, 'id': obj.link_id}
        return None

    def get_region(self, obj):
        """Return region as a name string regardless of whether it's an FK or text."""
        if obj.region_id:
            return obj.region.name
        # Fallback to legacy free-text value
        return obj.region_text or None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('region'):
            data.pop('region', None)
        if data.get('link') is None:
            data.pop('link', None)
        return data


class CulturalEventRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['id', 'name']


class CulturalEventRecipeNestedSerializer(serializers.ModelSerializer):
    """Compact recipe representation for nesting under a CulturalEvent."""
    class Meta:
        model = Recipe
        fields = ['id', 'title']


class CulturalEventSerializer(serializers.ModelSerializer):
    """Serializer for CulturalEvent list/detail and write operations.

    Reads expose a nested `region` object (id + name) and a `recipes` list
    derived from the junction table. Writes accept a flat `region` integer
    via a separate write-only `region_id` field so the API stays consistent
    with the rest of cultural_content.
    """
    region = CulturalEventRegionSerializer(read_only=True)
    region_id = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(),
        source='region',
        write_only=True,
        required=False,
        allow_null=True,
    )
    recipes = serializers.SerializerMethodField()

    class Meta:
        model = CulturalEvent
        fields = [
            'id', 'name', 'date_rule', 'region', 'region_id',
            'description', 'recipes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_recipes(self, obj):
        links = obj.event_recipes.select_related('recipe').all()
        return CulturalEventRecipeNestedSerializer(
            [link.recipe for link in links], many=True,
        ).data


class CulturalEventRecipeSerializer(serializers.ModelSerializer):
    """Serializer for the CulturalEvent <-> Recipe junction table."""
    recipe = CulturalEventRecipeNestedSerializer(read_only=True)
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.all(),
        source='recipe',
        write_only=True,
    )
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=CulturalEvent.objects.all(),
        source='event',
        write_only=True,
    )
    event = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CulturalEventRecipe
        fields = ['id', 'event', 'event_id', 'recipe', 'recipe_id', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        event = attrs.get('event')
        recipe = attrs.get('recipe')
        if event and recipe and CulturalEventRecipe.objects.filter(
            event=event, recipe=recipe,
        ).exists():
            raise serializers.ValidationError(
                'This recipe is already linked to this event.'
            )
        return attrs
