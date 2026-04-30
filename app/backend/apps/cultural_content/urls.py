from django.urls import path

from .views import DailyCulturalContentView

urlpatterns = [
    path('cultural-content/daily/', DailyCulturalContentView.as_view(), name='daily_cultural_content'),
]
