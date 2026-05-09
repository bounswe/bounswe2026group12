from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.personalization import rank_items, score_cultural_content
from .models import CulturalContent
from .serializers import CulturalContentCardSerializer

DAILY_LIMIT = 8


class DailyCulturalContentView(APIView):
    """GET /api/cultural-content/daily/

    Returns up to DAILY_LIMIT active cards. Authenticated users get items
    ranked by overlap with their onboarding profile (cultural_interests,
    regional_ties, religious_preferences, event_interests); ties broken
    by recency. Anonymous users get the most recent items.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        items = list(
            CulturalContent.objects
            .filter(is_active=True)
            .select_related('region')
            .order_by('-created_at', '-id')
        )
        items = rank_items(items, request.user, score_cultural_content)
        items = items[:DAILY_LIMIT]
        return Response(CulturalContentCardSerializer(items, many=True).data)
