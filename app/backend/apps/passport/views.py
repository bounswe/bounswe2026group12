from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CulturalPassport
from .serializers import CulturalPassportSerializer


class UserPassportView(APIView):
    """GET /api/users/<username>/passport/ (#583).

    Public read endpoint matching the visitor mode requirement: anonymous
    visitors and authenticated users get the same payload. Returns 404 when
    the username does not exist. Auto-creates a passport row on demand so
    older users still resolve even before the backfill migration runs.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(get_user_model(), username=username)
        passport, _ = CulturalPassport.objects.get_or_create(user=user)
        serializer = CulturalPassportSerializer(passport)
        return Response(serializer.data)
