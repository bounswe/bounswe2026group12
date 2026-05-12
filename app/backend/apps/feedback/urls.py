from django.urls import path
from .views import FeedbackCreateView

urlpatterns = [
    path('feedback/', FeedbackCreateView.as_view(), name='feedback-create'),
]
