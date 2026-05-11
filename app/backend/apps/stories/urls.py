from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoryViewSet, StoryCommentViewSet

router = DefaultRouter()
router.register(r'stories', StoryViewSet, basename='story')
router.register(r'story-comments', StoryCommentViewSet, basename='story-comment')

urlpatterns = [
    path('', include(router.urls)),
]
