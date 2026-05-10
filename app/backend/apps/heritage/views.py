from django.db.models import Count
from rest_framework import permissions, viewsets

from .models import HeritageGroup, HeritageJourneyStep
from .serializers import (
    HeritageGroupDetailSerializer,
    HeritageGroupListSerializer,
    HeritageJourneyStepSerializer,
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
