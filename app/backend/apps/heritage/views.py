from django.db.models import Count
from rest_framework import permissions, viewsets

from .models import HeritageGroup
from .serializers import HeritageGroupDetailSerializer, HeritageGroupListSerializer


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
