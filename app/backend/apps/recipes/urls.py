from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecipeViewSet, IngredientViewSet, UnitViewSet, RegionViewSet

router = DefaultRouter()
router.register(r'recipes', RecipeViewSet, basename='recipe')
router.register(r'ingredients', IngredientViewSet, basename='ingredient')
router.register(r'units', UnitViewSet, basename='unit')
router.register(r'regions', RegionViewSet, basename='region')

urlpatterns = [
    path('', include(router.urls)),
]
