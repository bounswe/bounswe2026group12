from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HeritageGroupViewSet

router = DefaultRouter()
router.register(r'heritage-groups', HeritageGroupViewSet, basename='heritage-group')

urlpatterns = [
    path('', include(router.urls)),
]
