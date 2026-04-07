from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from apps.recipes.models import Recipe
from apps.recipes.serializers import RecipeSerializer
from apps.stories.models import Story
from apps.stories.serializers import StorySerializer

class GlobalSearchView(APIView):
    """
    GET /api/search/?q=keyword&region=name
    Public search functionality across Recipes and Stories.
    """
    permission_classes = [] # Handled by settings.py but explicit for clarity
    authentication_classes = [] # Search should be accessible without credentials

    def get(self, request):
        query = request.query_params.get('q', '')
        region_name = request.query_params.get('region', '')

        recipes = Recipe.objects.select_related('region', 'author').filter(is_published=True)
        stories = Story.objects.select_related('author', 'linked_recipe').filter(is_published=True)

        if query:
            # Search in titles and descriptions/bodies
            recipes = recipes.filter(Q(title__icontains=query) | Q(description__icontains=query))
            stories = stories.filter(Q(title__icontains=query) | Q(body__icontains=query))

        if region_name:
            recipes = recipes.filter(region__name__icontains=region_name)
            # Stories can be filtered by their linked recipe's region
            stories = stories.filter(linked_recipe__region__name__icontains=region_name)

        recipe_serializer = RecipeSerializer(recipes, many=True)
        story_serializer = StorySerializer(stories, many=True)

        return Response({
            'recipes': recipe_serializer.data,
            'stories': story_serializer.data
        }, status=status.HTTP_200_OK)
