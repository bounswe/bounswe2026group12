from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from apps.common.permissions import IsAuthorOrReadOnly
from apps.common.personalization import rank_items, score_story
from .models import Story
from .serializers import StorySerializer

class StoryViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Stories."""
    queryset = Story.objects.select_related('author', 'linked_recipe__region').prefetch_related(
        'linked_recipe__dietary_tags', 'linked_recipe__event_tags',
    ).all()
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    from apps.common.pagination import StandardResultsSetPagination
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ['list', 'retrieve']:
            if not self.request.user.is_authenticated:
                return qs.filter(is_published=True)
        return qs

    def list(self, request, *args, **kwargs):
        personalize = request.query_params.get('personalize') != '0'
        from apps.common.personalization import has_profile_terms
        
        if not personalize or not has_profile_terms(request.user):
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
        # Soft cap at 500 items
        items = rank_items(queryset[:500], request.user, score_story)
        
        page = self.paginate_queryset(items)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

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
