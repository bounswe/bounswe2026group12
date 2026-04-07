from rest_framework import viewsets, permissions
from apps.common.permissions import IsAuthorOrReadOnly
from .models import Story
from .serializers import StorySerializer

class StoryViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Stories."""
    queryset = Story.objects.select_related('author', 'linked_recipe').all()
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
