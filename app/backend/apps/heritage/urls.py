from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CulturalFactViewSet,
    HeritageGroupViewSet,
    HeritageJourneyStepViewSet,
)

router = DefaultRouter()
router.register(r'heritage-groups', HeritageGroupViewSet, basename='heritage-group')
router.register(
    r'heritage-journey-steps',
    HeritageJourneyStepViewSet,
    basename='heritage-journey-step',
)
router.register(r'cultural-facts', CulturalFactViewSet, basename='cultural-fact')

urlpatterns = [
    path('', include(router.urls)),
]
