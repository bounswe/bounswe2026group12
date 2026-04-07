from rest_framework import viewsets, permissions
from apps.common.permissions import IsAuthorOrReadOnly
from .models import Recipe, Ingredient, Unit, Region
from .serializers import RecipeSerializer, IngredientSerializer, UnitSerializer, RegionSerializer

class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Recipes."""
    queryset = Recipe.objects.select_related('region', 'author').prefetch_related('recipe_ingredients__ingredient', 'recipe_ingredients__unit').all()
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class IngredientViewSet(viewsets.ModelViewSet):
    """ViewSet for list and management of Ingredients."""
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

class UnitViewSet(viewsets.ModelViewSet):
    """ViewSet for list and management of Units."""
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnlyViewSet for Regions (GET only)."""
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [permissions.AllowAny]
