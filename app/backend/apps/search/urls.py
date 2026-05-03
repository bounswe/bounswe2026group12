from django.urls import path
from .views import GlobalSearchView, RecommendationsView

urlpatterns = [
    path('search/', GlobalSearchView.as_view(), name='global_search'),
    path('recommendations/', RecommendationsView.as_view(), name='recommendations'),
]
