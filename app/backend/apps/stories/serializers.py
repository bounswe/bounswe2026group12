from rest_framework import serializers
from .models import Story

class StorySerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    recipe_title = serializers.ReadOnlyField(source='linked_recipe.title')
    rank_score = serializers.SerializerMethodField()
    rank_reason = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'body', 'image', 'author', 'author_username',
            'linked_recipe', 'recipe_title', 'language',
            'is_published', 'created_at', 'rank_score', 'rank_reason'
        ]
        read_only_fields = ['author', 'created_at']

    def get_rank_score(self, obj):
        return getattr(obj, 'rank_score', 0)

    def get_rank_reason(self, obj):
        return getattr(obj, 'rank_reason', None)
