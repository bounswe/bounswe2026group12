from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    CulturalProfileUpdateSerializer,
)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                'user': UserProfileSerializer(user).data,
                **tokens
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            return Response({
                'user': UserProfileSerializer(user).data,
                **tokens
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TokenRefreshView(APIView):
    """
    Race-condition-safe TokenRefreshView that guarantees a stable error shape:
      { "code": "token_not_valid", "detail": "..." }
    Mobile httpClient interceptor relies on the `code` field to detect 401s.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_token = request.data.get("refresh")
        if not raw_token:
            return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(raw_token)
        except TokenError as e:
            return Response({"detail": str(e), "code": "token_not_valid"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            with transaction.atomic():
                jti = token["jti"]
                try:
                    outstanding = OutstandingToken.objects.select_for_update().get(jti=jti)
                except OutstandingToken.DoesNotExist:
                    return Response({"detail": "Token not found.", "code": "token_not_valid"}, status=status.HTTP_401_UNAUTHORIZED)

                if BlacklistedToken.objects.filter(token=outstanding).exists():
                    return Response(
                        {"detail": "Token has already been used or revoked.", "code": "token_not_valid"},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                BlacklistedToken.objects.create(token=outstanding)
                user = get_user_model().objects.get(id=token["user_id"])
                new_refresh = RefreshToken.for_user(user)
        except Exception:
            return Response({"detail": "Token refresh failed."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"access": str(new_refresh.access_token), "refresh": str(new_refresh)},
            status=status.HTTP_200_OK,
        )

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = CulturalProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(UserProfileSerializer(request.user).data)
