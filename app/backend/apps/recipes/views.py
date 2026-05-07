from functools import reduce
import operator

from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.common.permissions import IsAuthorOrReadOnly
from apps.common.personalization import rank_items, score_recipe, has_profile_terms
from .models import Recipe, Ingredient, Unit, Region, Comment, DietaryTag, EventTag, Vote
from .filters import apply_recipe_filters
from .serializers import (
    IngredientLookupSerializer,
    IngredientSerializer,
    RecipeSerializer,
    RegionSerializer,
    UnitLookupSerializer,
    UnitSerializer,
    CommentSerializer,
    DietaryTagLookupSerializer,
    DietaryTagSerializer,
    EventTagLookupSerializer,
    EventTagSerializer,
)



from apps.common.pagination import StandardResultsSetPagination

class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Recipes."""
    queryset = Recipe.objects.select_related('region', 'author').prefetch_related(
        'recipe_ingredients__ingredient', 'recipe_ingredients__unit',
        'dietary_tags', 'event_tags',
    ).all()
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            qs = apply_recipe_filters(qs, self.request.query_params)
        return qs

    def list(self, request, *args, **kwargs):
        personalize = request.query_params.get('personalize') != '0'
        
        # If no profile or opt-out, use standard lazy DB-paginated list
        if not personalize or not has_profile_terms(request.user):
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
        # Soft cap at 500 items for ranking to avoid materialization cliff
        items = rank_items(queryset[:500], request.user, score_recipe)

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
        recipe = self.get_object()
        recipe.is_published = True
        recipe.save(update_fields=['is_published'])
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAuthorOrReadOnly])
    def unpublish(self, request, pk=None):
        recipe = self.get_object()
        recipe.is_published = False
        recipe.save(update_fields=['is_published'])
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        recipe = self.get_object()
        
        if request.method == 'GET':
            comments = recipe.comments.all().annotate(helpful_count=models.Count('votes')).order_by('created_at')
            if request.user.is_authenticated:
                comments = comments.annotate(
                    user_has_voted=models.Exists(
                        Vote.objects.filter(comment=models.OuterRef('pk'), user=request.user)
                    )
                )
            page = self.paginate_queryset(comments)
            if page is not None:
                serializer = CommentSerializer(page, many=True, context=self.get_serializer_context())
                return self.get_paginated_response(serializer.data)
            serializer = CommentSerializer(comments, many=True, context=self.get_serializer_context())
            return Response(serializer.data)
            
        elif request.method == 'POST':
            if request.data.get('type') == 'QUESTION' and not recipe.qa_enabled:
                return Response({'detail': 'Q&A disabled for this recipe.'}, status=status.HTTP_403_FORBIDDEN)
            
            context = self.get_serializer_context()
            context['recipe'] = recipe
            serializer = CommentSerializer(data=request.data, context=context)
            if serializer.is_valid():
                serializer.save(author=request.user, recipe=recipe)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ModeratedLookupViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ['list', 'retrieve']:
            return queryset.filter(is_approved=True)
        return queryset

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return self.lookup_serializer_class
        return super().get_serializer_class()

class IngredientViewSet(ModeratedLookupViewSet):
    """ViewSet for list and management of Ingredients."""
    queryset = Ingredient.objects.all().order_by(Lower('name'), 'id')
    serializer_class = IngredientSerializer
    lookup_serializer_class = IngredientLookupSerializer

class UnitViewSet(ModeratedLookupViewSet):
    """ViewSet for list and management of Units."""
    queryset = Unit.objects.all().order_by(Lower('name'), 'id')
    serializer_class = UnitSerializer
    lookup_serializer_class = UnitLookupSerializer

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnlyViewSet for Regions (GET only)."""
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [permissions.AllowAny]

class DietaryTagViewSet(ModeratedLookupViewSet):
    """ViewSet for list/submission of dietary tags (M4-15)."""
    queryset = DietaryTag.objects.all().order_by(Lower('name'), 'id')
    serializer_class = DietaryTagSerializer
    lookup_serializer_class = DietaryTagLookupSerializer

class EventTagViewSet(ModeratedLookupViewSet):
    """ViewSet for list/submission of event tags (M4-15)."""
    queryset = EventTag.objects.all().order_by(Lower('name'), 'id')
    serializer_class = EventTagSerializer
    lookup_serializer_class = EventTagLookupSerializer

class CommentViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """ViewSet for deleting and interacting with comments."""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.annotate(helpful_count=models.Count('votes'))
        user = self.request.user
        if user.is_authenticated:
            qs = qs.annotate(
                user_has_voted=models.Exists(
                    Vote.objects.filter(comment=models.OuterRef('pk'), user=user)
                )
            )
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, pk=None):
        comment = self.get_object()
        vote, created = Vote.objects.get_or_create(user=request.user, comment=comment)
        if not created:
            vote.delete()
            return Response({'status': 'unvoted'}, status=status.HTTP_200_OK)
        return Response({'status': 'voted'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def helpful_count(self, request, pk=None):
        comment = self.get_object()
        # Ensure we count the votes directly in case the queryset is not annotated
        # or we can rely on the annotation if get_object() applies it.
        count = getattr(comment, 'helpful_count', comment.votes.count())
        return Response({'helpful_count': count})
