from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from apps.recipes.models import Recipe
from apps.stories.models import Story


class GlobalSearchView(APIView):
    """
    GET /api/search/?q=keyword&region=name&language=en
    Public search across Recipes and Stories.
    Returns unified results with type metadata for frontend navigation.
    """
    permission_classes = []
    authentication_classes = []

    def _serialize_recipe(self, recipe):
        return {
            'result_type': 'recipe',
            'id': recipe.id,
            'title': recipe.title,
            'description': recipe.description[:200],
            'image': recipe.image.url if recipe.image else None,
            'region_tag': recipe.region.name if recipe.region else None,
            'author_username': recipe.author.username,
            'created_at': recipe.created_at,
        }

    def _serialize_story(self, story):
        return {
            'result_type': 'story',
            'id': story.id,
            'title': story.title,
            'body': story.body[:200],
            'region_tag': story.linked_recipe.region.name if story.linked_recipe and story.linked_recipe.region else None,
            'linked_recipe_id': story.linked_recipe_id,
            'author_username': story.author.username,
            'created_at': story.created_at,
        }

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        region_name = request.query_params.get('region', '').strip()
        language = request.query_params.get('language', '').strip()

        recipes = Recipe.objects.select_related('region', 'author').filter(is_published=True)
        stories = Story.objects.select_related('author', 'linked_recipe__region').filter(is_published=True)

        if query:
            recipes = recipes.filter(Q(title__icontains=query) | Q(description__icontains=query))
            stories = stories.filter(Q(title__icontains=query) | Q(body__icontains=query))

        if region_name:
            recipes = recipes.filter(region__name__icontains=region_name)
            stories = stories.filter(linked_recipe__region__name__icontains=region_name)

        if language:
            recipes = recipes.filter(author__preferred_language__iexact=language)
            stories = stories.filter(author__preferred_language__iexact=language)

        recipe_results = [self._serialize_recipe(r) for r in recipes]
        story_results = [self._serialize_story(s) for s in stories]

        return Response({
            'recipes': recipe_results,
            'stories': story_results,
            'total_count': len(recipe_results) + len(story_results),
        }, status=status.HTTP_200_OK)
