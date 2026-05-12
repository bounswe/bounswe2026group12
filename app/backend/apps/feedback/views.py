from rest_framework import generics, permissions
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from .models import Feedback
from .serializers import FeedbackSerializer

class FeedbackAnonThrottle(AnonRateThrottle):
    scope = 'feedback_anon'

class FeedbackUserThrottle(UserRateThrottle):
    scope = 'feedback_auth'

class FeedbackCreateView(generics.CreateAPIView):
    """
    POST /api/feedback/
    Accepts feedback messages from both authenticated and anonymous users.
    Throttled: 5/hr for anonymous, 30/hr for authenticated.
    """
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_throttles(self):
        if self.request.user and self.request.user.is_authenticated:
            return [FeedbackUserThrottle()]
        return [FeedbackAnonThrottle()]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        
        # Extract metadata from headers
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')[:255]
        # 'path' typically refers to the page the user was on, provided via Referer header
        path = self.request.META.get('HTTP_REFERER', '')[:255]
        
        serializer.save(
            user=user,
            user_agent=user_agent,
            path=path
        )
