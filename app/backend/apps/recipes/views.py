from django.db.models.functions import Lower
from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.common.permissions import IsAuthorOrReadOnly
from .models import Recipe, Ingredient, Unit, Region, Comment
from .serializers import (
    IngredientLookupSerializer,
    IngredientSerializer,
    RecipeSerializer,
    RegionSerializer,
    UnitLookupSerializer,
    UnitSerializer,
    CommentSerializer,
)

from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Recipes."""
    queryset = Recipe.objects.select_related('region', 'author').prefetch_related('recipe_ingredients__ingredient', 'recipe_ingredients__unit').all()
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardResultsSetPagination

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
            comments = recipe.comments.all().order_by('created_at')
            page = self.paginate_queryset(comments)
            if page is not None:
                serializer = CommentSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            if request.data.get('type') == 'QUESTION' and not recipe.qa_enabled:
                return Response({'detail': 'Q&A disabled for this recipe.'}, status=status.HTTP_403_FORBIDDEN)
                
            serializer = CommentSerializer(data=request.data, context={'recipe': recipe, 'request': request})
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

class CommentViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """ViewSet for deleting comments."""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
