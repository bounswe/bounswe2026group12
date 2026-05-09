from django.urls import path

from .views import (
    BoundingBoxDiscoverView,
    RegionContentView,
    RegionDetailView,
    RegionIndexView,
)

urlpatterns = [
    # List all geo-enriched regions (map pins)
    path('map/regions/', RegionIndexView.as_view(), name='map-region-index'),
    # Single region detail + content counts
    path('map/regions/<int:pk>/', RegionDetailView.as_view(), name='map-region-detail'),
    # Paginated content for a specific region
    path('map/regions/<int:pk>/content/', RegionContentView.as_view(), name='map-region-content'),
    # Viewport bounding-box query — primary map discovery endpoint
    path('map/discover/', BoundingBoxDiscoverView.as_view(), name='map-discover'),
]
