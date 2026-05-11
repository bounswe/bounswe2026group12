from django.db import models
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.personalization import rank_items, score_cultural_content
from .models import CulturalContent, CulturalEvent, CulturalEventRecipe
from .serializers import (
    CulturalContentCardSerializer,
    CulturalEventRecipeSerializer,
    CulturalEventSerializer,
)

DAILY_LIMIT = 8


class DailyCulturalContentView(APIView):
    """GET /api/cultural-content/daily/

    Returns up to DAILY_LIMIT active cards. Authenticated users get items
    ranked by overlap with their onboarding profile (cultural_interests,
    regional_ties, religious_preferences, event_interests); ties broken
    by recency. Anonymous users get the most recent items.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        items = list(
            CulturalContent.objects
            .filter(is_active=True)
            .select_related('region')
            .order_by('-created_at', '-id')
        )
        items = rank_items(items, request.user, score_cultural_content)
        items = items[:DAILY_LIMIT]
        return Response(CulturalContentCardSerializer(items, many=True).data)


class CulturalEventViewSet(viewsets.ModelViewSet):
    """CRUD for CulturalEvent (#528).

    Reads are public; writes require staff. This mirrors how curated
    content surfaces in cultural_content behave (DailyCulturalContentView
    is read-only public; curation happens via admin / staff endpoints).

    Filters:
      ``?month=MM`` matches events whose date_rule is ``fixed:MM-DD`` for
      the given month. Lunar rules are included alongside the matches so
      seasonal listings still surface them; the frontend resolves the
      actual lunar date.
      ``?region=<id>`` filters by region FK.
    """
    queryset = CulturalEvent.objects.select_related('region').prefetch_related(
        'event_recipes__recipe',
    ).all()
    serializer_class = CulturalEventSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        month = params.get('month')
        if month:
            qs = qs.filter(
                models.Q(date_rule__startswith=f'fixed:{month}-')
                | models.Q(date_rule__startswith='lunar:')
            )

        region = params.get('region')
        if region:
            qs = qs.filter(region_id=region)

        return qs


class CulturalEventRecipeViewSet(viewsets.ModelViewSet):
    """CRUD for the CulturalEvent <-> Recipe junction (#528)."""
    queryset = CulturalEventRecipe.objects.select_related('event', 'recipe').all()
    serializer_class = CulturalEventRecipeSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]
