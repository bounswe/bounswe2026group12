from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .moderation_views import (
    LookupModerationActionView,
    LookupModerationQueueView,
)
from .views import (
    RecipeViewSet, IngredientViewSet, UnitViewSet, RegionViewSet, CommentViewSet,
    DietaryTagViewSet, EventTagViewSet, ReligionViewSet, ConvertView,
    CheckedIngredientsView,
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
    path(
        'recipes/<str:recipe_id>/checked-ingredients/',
        CheckedIngredientsView.as_view(),
        name='recipe-checked-ingredients',
    ),
    path('convert/', ConvertView.as_view(), name='convert'),
    path(
        'moderation/lookups/',
        LookupModerationQueueView.as_view(),
        name='lookup-moderation-queue',
    ),
    path(
        'moderation/lookups/<str:type_key>/<int:pk>/approve/',
        LookupModerationActionView.as_view(action='approve'),
        name='lookup-moderation-approve',
    ),
    path(
        'moderation/lookups/<str:type_key>/<int:pk>/reject/',
        LookupModerationActionView.as_view(action='reject'),
        name='lookup-moderation-reject',
    ),
]
