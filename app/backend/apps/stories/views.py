from django.db import models as db_models
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from apps.common.ids import is_ulid
from apps.common.permissions import IsAuthorOrReadOnly
from apps.common.pagination import StandardResultsSetPagination
from apps.common.personalization import rank_items, score_story, has_profile_terms
from .models import Story, StoryComment, StoryVote
from .serializers import StorySerializer, StoryCommentSerializer


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
                return qs.filter(is_published=True)
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

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        story = self.get_object()

        if request.method == 'GET':
            qs = story.comments.all().annotate(
                helpful_count=db_models.Count('votes')
            ).order_by('created_at')
            if request.user.is_authenticated:
                qs = qs.annotate(
                    user_has_voted=db_models.Exists(
                        StoryVote.objects.filter(
                            comment=db_models.OuterRef('pk'), user=request.user
                        )
                    )
                )
            page = self.paginate_queryset(qs)
            if page is not None:
                serializer = StoryCommentSerializer(page, many=True, context=self.get_serializer_context())
                return self.get_paginated_response(serializer.data)
            serializer = StoryCommentSerializer(qs, many=True, context=self.get_serializer_context())
            return Response(serializer.data)

        context = self.get_serializer_context()
        context['story'] = story
        serializer = StoryCommentSerializer(data=request.data, context=context)
        if serializer.is_valid():
            serializer.save(author=request.user, story=story)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StoryCommentViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """ViewSet for deleting and voting on story comments."""
    queryset = StoryComment.objects.all()
    serializer_class = StoryCommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset().annotate(helpful_count=db_models.Count('votes'))
        user = self.request.user
        if user.is_authenticated:
            qs = qs.annotate(
                user_has_voted=db_models.Exists(
                    StoryVote.objects.filter(comment=db_models.OuterRef('pk'), user=user)
                )
            )
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, pk=None):
        comment = self.get_object()
        vote, created = StoryVote.objects.get_or_create(user=request.user, comment=comment)
        if not created:
            vote.delete()
            return Response({'status': 'unvoted'}, status=status.HTTP_200_OK)
        return Response({'status': 'voted'}, status=status.HTTP_201_CREATED)
