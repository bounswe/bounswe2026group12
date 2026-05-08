from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RecipeViewSet, IngredientViewSet, UnitViewSet, RegionViewSet, CommentViewSet,
    DietaryTagViewSet, EventTagViewSet, ReligionViewSet,
)

router = DefaultRouter()
router.register(r'recipes', RecipeViewSet, basename='recipe')
router.register(r'ingredients', IngredientViewSet, basename='ingredient')
router.register(r'units', UnitViewSet, basename='unit')
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'dietary-tags', DietaryTagViewSet, basename='dietary-tag')
router.register(r'event-tags', EventTagViewSet, basename='event-tag')
router.register(r'religions', ReligionViewSet, basename='religion')

urlpatterns = [
    path('', include(router.urls)),
]
