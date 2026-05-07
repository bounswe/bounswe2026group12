from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Q
from apps.common.personalization import (
    rank_items,
    rank_payloads,
    score_recipe,
    score_story,
    has_profile_terms,
    WEIGHTS,
)
from apps.recipes.models import Recipe
from apps.recipes.filters import apply_recipe_filters
from apps.stories.models import Story


class GlobalSearchView(APIView):
    """
    GET /api/search/?q=keyword&region=name&language=en
    Public search across Recipes and Stories.
    Returns unified results with type metadata for frontend navigation.
    """
    permission_classes = [permissions.AllowAny]

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
            'rank_score': getattr(recipe, 'rank_score', 0),
            'rank_reason': getattr(recipe, 'rank_reason', None),
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
            'rank_score': getattr(story, 'rank_score', 0),
            'rank_reason': getattr(story, 'rank_reason', None),
        }

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        region_name = request.query_params.get('region', '').strip()
        language = request.query_params.get('language', '').strip()

        recipes = Recipe.objects.select_related('region', 'author').prefetch_related(
            'dietary_tags', 'event_tags',
        ).filter(is_published=True)
        stories = Story.objects.select_related('author', 'linked_recipe__region').prefetch_related(
            'linked_recipe__dietary_tags', 'linked_recipe__event_tags',
        ).filter(is_published=True)

        if query:
            recipes = recipes.filter(Q(title__icontains=query) | Q(description__icontains=query))
            stories = stories.filter(Q(title__icontains=query) | Q(body__icontains=query))

        if region_name:
            stories = stories.filter(linked_recipe__region__name__icontains=region_name)

        if language:
            recipes = recipes.filter(author__preferred_language__iexact=language)
            stories = stories.filter(author__preferred_language__iexact=language)

        recipes = apply_recipe_filters(recipes, request.query_params)

        personalize = request.query_params.get('personalize') != '0'
        use_ranking = personalize and has_profile_terms(request.user)

        if use_ranking:
            # Soft cap at 500 for each to avoid materialization cliff
            ranked_recipes = rank_items(recipes[:500], request.user, score_recipe)
            ranked_stories = rank_items(stories[:500], request.user, score_story)
        else:
            # Skip ranking, use standard ordering (id/recency)
            ranked_recipes = recipes[:100]
            ranked_stories = stories[:100]

        recipe_results = [self._serialize_recipe(r) for r in ranked_recipes]
        story_results = [self._serialize_story(s) for s in ranked_stories]
        unified_results = rank_payloads([
            {'type': 'recipe', **item} for item in recipe_results
        ] + [
            {'type': 'story', **item} for item in story_results
        ])

        return Response({
            'recipes': recipe_results,
            'stories': story_results,
            'results': unified_results,
            'total_count': len(recipe_results) + len(story_results),
        }, status=status.HTTP_200_OK)


class RecommendationsView(APIView):
    """GET /api/recommendations/?surface=feed|explore|map|recs&limit=10"""

    permission_classes = [permissions.AllowAny]

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
            'rank_score': getattr(recipe, 'rank_score', 0),
            'rank_reason': getattr(recipe, 'rank_reason', None),
        }

    def _serialize_story(self, story):
        return {
            'result_type': 'story',
            'id': story.id,
            'title': story.title,
            'body': story.body[:200],
            'image': story.image.url if story.image else None,
            'region_tag': story.linked_recipe.region.name if story.linked_recipe and story.linked_recipe.region else None,
            'author_username': story.author.username,
            'created_at': story.created_at,
            'rank_score': getattr(story, 'rank_score', 0),
            'rank_reason': getattr(story, 'rank_reason', None),
        }

    def get(self, request):
        surface = request.query_params.get('surface', 'feed').strip() or 'feed'
        limit = _bounded_limit(request.query_params.get('limit'), default=10, maximum=50)

        recipes = Recipe.objects.select_related('region', 'author').prefetch_related(
            'dietary_tags', 'event_tags',
        ).filter(is_published=True)
        stories = Story.objects.select_related('author', 'linked_recipe__region').prefetch_related(
            'linked_recipe__dietary_tags', 'linked_recipe__event_tags',
        ).filter(is_published=True)

        personalize = request.query_params.get('personalize') != '0'
        use_ranking = personalize and has_profile_terms(request.user)

        # Dynamic weights based on surface
        current_weights = WEIGHTS.copy()
        if surface == 'map':
            current_weights['regional'] *= 1.5
        elif surface == 'feed':
            # Recency is already handled in rank_items via sort keys,
            # but we could boost it further if needed.
            pass

        if use_ranking:
            # Custom scorer with dynamic weights
            ranked_recipes = rank_items(
                recipes[:500], request.user, score_recipe, 
                scorer_kwargs={'weights': current_weights}
            )
            ranked_stories = rank_items(
                stories[:500], request.user, score_story,
                scorer_kwargs={'weights': current_weights}
            )
        else:
            ranked_recipes = recipes[:limit]
            ranked_stories = stories[:limit]

        results = rank_payloads([
            self._serialize_recipe(recipe) for recipe in ranked_recipes
        ] + [
            self._serialize_story(story) for story in ranked_stories
        ])[:limit]

        return Response({
            'surface': surface,
            'results': results,
            'total_count': len(results),
        }, status=status.HTTP_200_OK)


def _bounded_limit(raw_value, *, default, maximum):
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return default
    return min(max(value, 1), maximum)
