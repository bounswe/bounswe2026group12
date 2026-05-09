from django.urls import path

from .moderation_views import (
    CulturalTagModerationActionView,
    CulturalTagModerationQueueView,
)
from .views import DailyCulturalContentView

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
]
