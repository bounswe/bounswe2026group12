from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from apps.common.permissions import IsAuthorOrReadOnly
from .models import Story
from .serializers import StorySerializer

class StoryViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Stories."""
    queryset = Story.objects.select_related('author').prefetch_related(
        'recipe_links__recipe__region', 'region'
    ).all()
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ['list', 'retrieve']:
            if not self.request.user.is_authenticated:
                return qs.filter(is_published=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAuthorOrReadOnly])
    def publish(self, request, pk=None):
        story = self.get_object()
        story.is_published = True
        story.save(update_fields=['is_published'])
        return Response(StorySerializer(story).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAuthorOrReadOnly])
    def unpublish(self, request, pk=None):
        story = self.get_object()
        story.is_published = False
        story.save(update_fields=['is_published'])
        return Response(StorySerializer(story).data)
