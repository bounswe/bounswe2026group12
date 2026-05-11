from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.common.ids import is_ulid
from apps.common.permissions import IsAuthorOrReadOnly
from apps.common.pagination import StandardResultsSetPagination
from apps.common.personalization import rank_items, score_story, has_profile_terms
from apps.recipes.views import apply_content_filters
from .models import Story
from .serializers import StorySerializer


class StoryViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Stories."""
    queryset = Story.objects.select_related('author', 'region').prefetch_related(
        'recipe_links__recipe__region',
        'recipe_links__recipe__dietary_tags',
        'recipe_links__recipe__event_tags',
        'recipe_links__recipe__religions',
        'dietary_tags',
        'event_tags',
        'religions',
        'heritage_memberships__heritage_group',
    ).all()
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardResultsSetPagination

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        lookup = {'public_id': lookup_value} if is_ulid(lookup_value) else {'pk': lookup_value}
        obj = get_object_or_404(queryset, **lookup)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ['list', 'retrieve']:
            if not self.request.user.is_authenticated:
                qs = qs.filter(is_published=True)
        
        if self.action == 'list':
            qs = apply_content_filters(qs, self.request.query_params, user=self.request.user)
            
            story_type = self.request.query_params.get('story_type')
            if story_type is not None:
                valid_values = {choice for choice, _ in Story.StoryType.choices}
                if story_type in valid_values:
                    qs = qs.filter(story_type=story_type)
                else:
                    qs = qs.none()
        return qs

    def list(self, request, *args, **kwargs):
        personalize = request.query_params.get('personalize') != '0'
        if not personalize or not has_profile_terms(request.user):
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
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
