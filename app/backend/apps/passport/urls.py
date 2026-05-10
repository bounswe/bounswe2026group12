from django.urls import path

from .views import UserPassportView

urlpatterns = [
    path(
        'users/<str:username>/passport/',
        UserPassportView.as_view(),
        name='user-passport',
    ),
]
