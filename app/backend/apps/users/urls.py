from django.urls import path
from .views import RegisterView, LoginView, LogoutView, MeView, PublicUserView, TokenRefreshView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # `users/me/` must stay before `users/<username>/` so the literal route wins.
    path('users/me/', MeView.as_view(), name='me'),
    path('users/<str:username>/', PublicUserView.as_view(), name='public-user-profile'),
]
