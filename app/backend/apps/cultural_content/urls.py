from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .moderation_views import (
    CulturalTagModerationActionView,
    CulturalTagModerationQueueView,
)
from .views import (
    CulturalEventRecipeViewSet,
    CulturalEventViewSet,
    DailyCulturalContentView,
)

router = DefaultRouter()
router.register(r'cultural-events', CulturalEventViewSet, basename='cultural-event')
router.register(
    r'cultural-event-recipes',
    CulturalEventRecipeViewSet,
    basename='cultural-event-recipe',
)

urlpatterns = [
    path('cultural-content/daily/', DailyCulturalContentView.as_view(), name='daily_cultural_content'),
    path(
        'moderation/cultural-tags/',
        CulturalTagModerationQueueView.as_view(),
        name='cultural-tag-moderation-queue',
    ),
    path(
        'moderation/cultural-tags/<str:type_key>/<int:pk>/approve/',
        CulturalTagModerationActionView.as_view(action='approve'),
        name='cultural-tag-moderation-approve',
    ),
    path(
        'moderation/cultural-tags/<str:type_key>/<int:pk>/reject/',
        CulturalTagModerationActionView.as_view(action='reject'),
        name='cultural-tag-moderation-reject',
    ),
    path('', include(router.urls)),
]
