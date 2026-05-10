from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DraftViewSet

router = DefaultRouter()
router.register(r'', DraftViewSet, basename='draft')

urlpatterns = [
    path('', include(router.urls)),
]
