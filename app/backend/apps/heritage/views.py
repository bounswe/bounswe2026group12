from django.db.models import Count
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CulturalFact, HeritageGroup, HeritageJourneyStep, IngredientRoute
from .serializers import (
    CulturalFactSerializer,
    HeritageGroupDetailSerializer,
    HeritageGroupListSerializer,
    HeritageJourneyStepSerializer,
    IngredientRouteSerializer,
)


class HeritageGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only API for HeritageGroup browse and detail.

    Writes go through the admin only for now (curator workflow). When a
    moderation flow is added later, this viewset can grow create/update
    actions without changing the read shape.
    """

    queryset = HeritageGroup.objects.all().annotate(
        member_count_annotated=Count('memberships'),
    )
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return HeritageGroupDetailSerializer
        return HeritageGroupListSerializer


class HeritageJourneyStepViewSet(viewsets.ModelViewSet):
    """CRUD for journey steps. Public reads, staff-only writes.

    Mirrors the curator workflow used by HeritageGroup: anyone can browse
    the timeline, but only admins can author steps until a moderation flow
    is introduced.
    """

    queryset = HeritageJourneyStep.objects.all().select_related('heritage_group')
    serializer_class = HeritageJourneyStepSerializer

    def get_permissions(self):
        if self.action in {'list', 'retrieve'}:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        group_id = self.request.query_params.get('heritage_group')
        if group_id:
            qs = qs.filter(heritage_group_id=group_id)
        return qs


class CulturalFactViewSet(viewsets.ModelViewSet):
    """CRUD API for "Did You Know?" cultural facts.

    Reads are public so the UI can pull facts on heritage and recipe
    pages without auth. Writes are staff-only because curators own the
    fact catalogue. Filterable by heritage_group or region.
    """

    serializer_class = CulturalFactSerializer
    queryset = CulturalFact.objects.select_related('heritage_group', 'region')

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'random'):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        heritage_group = self.request.query_params.get('heritage_group')
        region = self.request.query_params.get('region')
        if heritage_group is not None and heritage_group != '':
            qs = qs.filter(heritage_group_id=heritage_group)
        if region is not None and region != '':
            qs = qs.filter(region_id=region)
        return qs

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def random(self, request):
        """Return a single random fact, or 404 if none exist."""
        qs = self.get_queryset()
        fact = qs.order_by('?').first()
        if fact is None:
            return Response(status=404)
        return Response(self.get_serializer(fact).data)



class IngredientRouteViewSet(viewsets.ModelViewSet):
    """CRUD for ingredient migration routes.

    Public reads for map animations; staff-only writes for curation.
    Supports filtering by ingredient_id.
    """

    queryset = IngredientRoute.objects.select_related('ingredient')
    serializer_class = IngredientRouteSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        ingredient_id = self.request.query_params.get('ingredient')
        if ingredient_id:
            qs = qs.filter(ingredient_id=ingredient_id)
        return qs
