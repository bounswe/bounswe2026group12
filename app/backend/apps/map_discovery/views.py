from django.db.models import Count, Q
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cultural_content.models import CulturalContent
from apps.recipes.models import Recipe, Region
from apps.stories.models import Story

from .serializers import (
    MapCulturalCardSerializer,
    MapRecipeCardSerializer,
    MapStoryCardSerializer,
    RegionGeoSerializer,
    RegionGeoWithCountsSerializer,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class MapPageNumberPagination(PageNumberPagination):
    """Standard page-number pagination used across all map content endpoints."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _annotate_region_counts(qs):
    """Annotate a Region queryset with published content counts.

    Counts are for published recipes, published stories, and active
    cultural content that reference each region.
    """
    return qs.annotate(
        recipe_count=Count(
            'recipes',
            filter=Q(recipes__is_published=True),
            distinct=True,
        ),
        story_count=Count(
            'stories',
            filter=Q(stories__is_published=True),
            distinct=True,
        ),
        cultural_count=Count(
            'cultural_content',
            filter=Q(cultural_content__is_active=True),
            distinct=True,
        ),
    )


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class RegionIndexView(APIView):
    """GET /api/map/regions/

    Returns all regions that have center coordinates set, with content counts.
    This is the primary feed for placing pins/markers on the map.

    Query params:
        geo_only (bool, default true): if false, return all regions even those
            without coordinates (useful for admin validation).
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        geo_only = request.query_params.get('geo_only', 'true').lower() != 'false'
        qs = Region.objects.select_related('parent').all()
        if geo_only:
            qs = qs.filter(latitude__isnull=False, longitude__isnull=False)
        qs = _annotate_region_counts(qs).order_by('name')
        serializer = RegionGeoWithCountsSerializer(qs, many=True)
        return Response(serializer.data)


class RegionDetailView(APIView):
    """GET /api/map/regions/<id>/

    Returns a single region with geo data and content counts.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, pk):
        try:
            region = _annotate_region_counts(
                Region.objects.select_related('parent')
            ).get(pk=pk)
        except Region.DoesNotExist:
            return Response({'detail': 'Region not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(RegionGeoWithCountsSerializer(region).data)


class RegionContentView(APIView):
    """GET /api/map/regions/<id>/content/

    Returns paginated content (recipes, stories, cultural content) tagged to
    a specific region.

    Query params:
        type (str): filter by content type — 'recipe', 'story', or 'cultural'.
            Omit to receive all types interleaved by creation date.
        page (int): page number (default 1).
        page_size (int): items per page (default 20, max 100).
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, pk):
        try:
            region = Region.objects.get(pk=pk)
        except Region.DoesNotExist:
            return Response({'detail': 'Region not found.'}, status=status.HTTP_404_NOT_FOUND)

        content_type = request.query_params.get('type', '').strip().lower()
        paginator = MapPageNumberPagination()

        results = []

        if not content_type or content_type == 'recipe':
            recipes = (
                Recipe.objects
                .filter(region=region, is_published=True)
                .select_related('region', 'author')
                .order_by('-created_at')
            )
            results += list(MapRecipeCardSerializer(recipes, many=True).data)

        if not content_type or content_type == 'story':
            # Stories tagged directly to the region OR inheriting via linked recipe
            stories = (
                Story.objects
                .filter(
                    Q(region=region) | Q(linked_recipe__region=region),
                    is_published=True,
                )
                .select_related('author', 'region', 'linked_recipe__region')
                .distinct()
                .order_by('-created_at')
            )
            results += list(MapStoryCardSerializer(stories, many=True).data)

        if not content_type or content_type == 'cultural':
            cultural = (
                CulturalContent.objects
                .filter(region=region, is_active=True)
                .select_related('region')
                .order_by('-created_at')
            )
            results += list(MapCulturalCardSerializer(cultural, many=True).data)

        # Sort unified results by created_at descending (cultural content has no
        # created_at if type is cultural-only, handled gracefully)
        results.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        page = paginator.paginate_queryset(results, request)
        if page is not None:
            return paginator.get_paginated_response(page)
        return Response({
            'region': RegionGeoSerializer(region).data,
            'results': results,
            'count': len(results),
        })


class BoundingBoxDiscoverView(APIView):
    """GET /api/map/discover/

    Returns regions (with content counts) whose center point falls within the
    given viewport bounding box. This is the primary endpoint called when the
    user pans or zooms the map.

    Required query params:
        north (float): northern latitude bound
        south (float): southern latitude bound
        east  (float): eastern longitude bound
        west  (float): western longitude bound

    Optional query params:
        type (str): 'recipe', 'story', or 'cultural' — filters content counts
            to only the specified type (does not change which regions appear).
        q    (str): text filter — only include regions that have at least one
            piece of content matching the keyword.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    PARAM_ERROR = (
        'Provide north, south, east, west as numeric latitude/longitude bounds.'
    )

    def _parse_bbox(self, params):
        """Parse and validate bounding box from query params.

        Returns (north, south, east, west) floats or raises ValueError.
        """
        try:
            north = float(params['north'])
            south = float(params['south'])
            east  = float(params['east'])
            west  = float(params['west'])
        except (KeyError, TypeError, ValueError):
            raise ValueError(self.PARAM_ERROR)

        if not (-90 <= south <= north <= 90):
            raise ValueError('south must be ≤ north, both in [-90, 90].')
        if not (-180 <= west <= 180) or not (-180 <= east <= 180):
            raise ValueError('east and west must be in [-180, 180].')

        return north, south, east, west

    def get(self, request):
        try:
            north, south, east, west = self._parse_bbox(request.query_params)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        content_type = request.query_params.get('type', '').strip().lower()
        keyword      = request.query_params.get('q', '').strip()

        # Find regions whose center is inside the viewport rectangle.
        # We only return regions that have coordinates (pins only make sense
        # when we know where to put them).
        qs = Region.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False,
            latitude__lte=north,
            latitude__gte=south,
            longitude__lte=east,
            longitude__gte=west,
        ).select_related('parent')

        # Optional keyword filter: only include regions with matching content
        if keyword:
            qs = qs.filter(
                Q(recipes__title__icontains=keyword, recipes__is_published=True) |
                Q(stories__title__icontains=keyword, stories__is_published=True) |
                Q(cultural_content__title__icontains=keyword, cultural_content__is_active=True)
            ).distinct()

        qs = _annotate_region_counts(qs).order_by('name')

        serializer = RegionGeoWithCountsSerializer(qs, many=True)
        total_content = sum(
            (r['content_count']['recipes'] +
             r['content_count']['stories'] +
             r['content_count']['cultural_content'])
            for r in serializer.data
        )

        return Response({
            'viewport': {
                'north': north, 'south': south,
                'east':  east,  'west':  west,
            },
            'regions': serializer.data,
            'total_content': total_content,
        })
