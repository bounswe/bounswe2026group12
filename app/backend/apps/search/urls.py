from django.urls import path
from .views import GlobalSearchView

urlpatterns = [
    path('search/', GlobalSearchView.as_view(), name='global_search'),
]
