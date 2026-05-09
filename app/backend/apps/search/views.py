from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.personalization import (
    has_profile_terms,
    rank_items,
    rank_payloads,
    score_recipe,
    score_story,
    WEIGHTS,
)
from apps.recipes.models import Recipe
from apps.recipes.views import apply_content_filters
from apps.search.query_parser import parse_query
from apps.stories.models import Story


def _serialize_recipe_payload(recipe):
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


def _serialize_story_payload(story):
    # Direct region first, then fall back to the first linked recipe's region.
    links = list(story.recipe_links.all())
    first_link = links[0] if links else None

    if story.region_id:
        region_tag = story.region.name
    elif first_link and first_link.recipe.region:
        region_tag = first_link.recipe.region.name
    else:
        region_tag = None

    return {
        'result_type': 'story',
        'id': story.id,
        'title': story.title,
        'body': story.body[:200],
        'image': story.image.url if story.image else None,
        'region_tag': region_tag,
        'linked_recipe_id': first_link.recipe_id if first_link else None,
        'author_username': story.author.username,
        'created_at': story.created_at,
        'rank_score': getattr(story, 'rank_score', 0),
        'rank_reason': getattr(story, 'rank_reason', None),
    }


def _recipe_queryset():
    return Recipe.objects.select_related('region', 'author').prefetch_related(
        'dietary_tags', 'event_tags', 'religions',
    ).filter(is_published=True)


def _story_queryset():
    return Story.objects.select_related('author', 'region').prefetch_related(
        'recipe_links__recipe__region',
        'recipe_links__recipe__dietary_tags',
        'recipe_links__recipe__event_tags',
        'recipe_links__recipe__religions',
        'dietary_tags', 'event_tags', 'religions',
    ).filter(is_published=True)


class GlobalSearchView(APIView):
    """
    GET /api/search/?q=keyword&region=name&language=en
    Public search across Recipes and Stories.
    Returns unified results with type metadata for frontend navigation.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        language = request.query_params.get('language', '').strip()

        parsed = parse_query(query)
        has_facets = bool(
            parsed['region'] or parsed['event']
            or parsed['diets'] or parsed['religions']
        )

        # Inject parsed facets into a working copy of query_params, but never
        # override values the client already supplied (#389).
        params = request.query_params.copy()
        if parsed['region'] and not params.get('region'):
            params['region'] = parsed['region']
        if parsed['event'] and not params.get('event'):
            params['event'] = parsed['event']
        if parsed['diets'] and not params.get('diet'):
            params['diet'] = ','.join(parsed['diets'])
        if parsed['religions'] and not params.get('religion'):
            params['religion'] = ','.join(parsed['religions'])

        # Keep the existing free-text behavior when no facet matched, so plain
        # keyword search is byte-for-byte identical to the pre-#389 endpoint.
        text_query = parsed['cleaned_query'] if has_facets else query

        recipes = _recipe_queryset()
        stories = _story_queryset()

        if text_query:
            recipes = recipes.filter(Q(title__icontains=text_query) | Q(description__icontains=text_query))
            stories = stories.filter(Q(title__icontains=text_query) | Q(body__icontains=text_query))

        if language:
            recipes = recipes.filter(author__preferred_language__iexact=language)
            stories = stories.filter(author__preferred_language__iexact=language)

        recipes = apply_content_filters(recipes, params)
        stories = apply_content_filters(stories, params)

        personalize = request.query_params.get('personalize') != '0'
        use_ranking = personalize and has_profile_terms(request.user)

        # Light bias toward regional/event matches when the parser surfaced
        # them, so tag-aligned items outrank items that only matched on the
        # residual free text.
        weights = dict(WEIGHTS)
        if parsed['region']:
            weights['regional'] = int(weights['regional'] * 1.5)
        if parsed['event']:
            weights['event'] = int(weights['event'] * 1.5)

        if use_ranking:
            ranked_recipes = rank_items(
                recipes[:500], request.user, score_recipe,
                scorer_kwargs={'weights': weights},
            )
            ranked_stories = rank_items(
                stories[:500], request.user, score_story,
                scorer_kwargs={'weights': weights},
            )
        else:
            ranked_recipes = recipes[:100]
            ranked_stories = stories[:100]

        recipe_results = [_serialize_recipe_payload(r) for r in ranked_recipes]
        story_results = [_serialize_story_payload(s) for s in ranked_stories]
        unified = rank_payloads(recipe_results + story_results)

        return Response({
            'recipes': recipe_results,
            'stories': story_results,
            'results': unified,
            'total_count': len(recipe_results) + len(story_results),
            'parsed': {
                'region': parsed['region'],
                'event': parsed['event'],
                'diets': parsed['diets'],
                'religions': parsed['religions'],
            },
        }, status=status.HTTP_200_OK)


class RecommendationsView(APIView):
    """GET /api/recommendations/?surface=feed|explore|map|recs&limit=10

    Returns a single unified ranked feed across recipes and stories.
    `surface` adjusts the ranking weights: map biases toward regional matches,
    others use the default weights.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        surface = (request.query_params.get('surface') or 'feed').strip()
        limit = _bounded_limit(request.query_params.get('limit'), default=10, maximum=50)

        recipes = _recipe_queryset()
        stories = _story_queryset()

        personalize = request.query_params.get('personalize') != '0'
        use_ranking = personalize and has_profile_terms(request.user)

        weights = dict(WEIGHTS)
        if surface == 'map':
            weights['regional'] = int(weights['regional'] * 1.5)

        if use_ranking:
            ranked_recipes = rank_items(
                recipes[:500], request.user, score_recipe,
                scorer_kwargs={'weights': weights},
            )
            ranked_stories = rank_items(
                stories[:500], request.user, score_story,
                scorer_kwargs={'weights': weights},
            )
        else:
            ranked_recipes = recipes[:limit]
            ranked_stories = stories[:limit]

        results = rank_payloads(
            [_serialize_recipe_payload(r) for r in ranked_recipes]
            + [_serialize_story_payload(s) for s in ranked_stories]
        )[:limit]

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
