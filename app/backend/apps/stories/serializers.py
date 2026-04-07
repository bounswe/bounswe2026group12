from rest_framework import serializers
from .models import Story

class StorySerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    recipe_title = serializers.ReadOnlyField(source='linked_recipe.title')

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'body', 'author', 'author_username',
            'linked_recipe', 'recipe_title', 'language',
            'is_published', 'created_at'
        ]
        read_only_fields = ['author', 'created_at']
