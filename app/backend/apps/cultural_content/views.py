from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CulturalContent
from .serializers import CulturalContentCardSerializer

DAILY_LIMIT = 8


def _user_tag_set(user):
    """Concatenate the four onboarding tag axes into a single lowercase set."""
    if not user or not user.is_authenticated:
        return set()
    tags = []
    for field in ('cultural_interests', 'regional_ties', 'religious_preferences', 'event_interests'):
        tags.extend(getattr(user, field, []) or [])
    return {t.strip().lower() for t in tags if isinstance(t, str) and t.strip()}


def _score(content, user_tag_set):
    if not user_tag_set:
        return 0
    content_tags = {t.strip().lower() for t in (content.cultural_tags or []) if isinstance(t, str) and t.strip()}
    return len(content_tags & user_tag_set)


class DailyCulturalContentView(APIView):
    """GET /api/cultural-content/daily/

    Returns up to DAILY_LIMIT active cards. Authenticated users get items
    ranked by overlap with their onboarding profile (cultural_interests,
    regional_ties, religious_preferences, event_interests); ties broken
    by recency. Anonymous users get the most recent items.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user_tags = _user_tag_set(request.user)
        items = list(CulturalContent.objects.filter(is_active=True).select_related('region'))
        # Sort by personalization score (desc) then by creation order (ID desc)
        items.sort(key=lambda c: (-_score(c, user_tags), -c.id))
        items = items[:DAILY_LIMIT]
        return Response(CulturalContentCardSerializer(items, many=True).data)
