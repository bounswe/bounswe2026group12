from rest_framework import serializers
from .models import Story


class StorySerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    recipe_title = serializers.ReadOnlyField(source='linked_recipe.title')
    # Expose region name for frontend display (string, not FK id)
    region_name = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'body', 'image', 'author', 'author_username',
            'linked_recipe', 'recipe_title', 'language',
            'region', 'region_name',
            'is_published', 'created_at'
        ]
        read_only_fields = ['author', 'created_at']

    def get_region_name(self, obj):
        """Return the effective region name: direct region > linked_recipe's region."""
        if obj.region_id:
            return obj.region.name
        if obj.linked_recipe and obj.linked_recipe.region:
            return obj.linked_recipe.region.name
        return None
