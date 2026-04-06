from rest_framework import viewsets, permissions
from .models import Recipe, Ingredient, Unit, Region
from .serializers import RecipeSerializer, IngredientSerializer, UnitSerializer, RegionSerializer

class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Recipes."""
    queryset = Recipe.objects.select_related('region', 'author').prefetch_related('recipe_ingredients__ingredient', 'recipe_ingredients__unit').all()
    serializer_class = RecipeSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class IngredientViewSet(viewsets.ModelViewSet):
    """ViewSet for list and management of Ingredients."""
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer

class UnitViewSet(viewsets.ModelViewSet):
    """ViewSet for list and management of Units."""
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnlyViewSet for Regions (GET only)."""
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
