from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MessageViewSet, ThreadViewSet

router = DefaultRouter()
router.register(r'threads', ThreadViewSet, basename='thread')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
]
