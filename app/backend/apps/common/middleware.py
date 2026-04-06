from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from rest_framework import status, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware to verify JWT tokens and attach the user to the request.
    This ensures request.user is set reliably before DRF views are even executed,
    and enforces endpoint protection for creation/editing APIs.
    """
    
    EXEMPT_POST_PATHS = [
        '/api/auth/register/',
        '/api/auth/login/',
    ]

    def process_request(self, request):
        # 1. Check if the request was already "force authenticated" (DRF tests)
        if hasattr(request, '_force_auth_user'):
            request.user = request._force_auth_user
            return None

        # 2. Attempt to authenticate via JWT header
        if not getattr(request, 'user', None) or not request.user.is_authenticated:
            try:
                auth_result = JWTAuthentication().authenticate(request)
                if auth_result:
                    user, token = auth_result
                    request.user = user
            except Exception:
                # If authentication fails here (invalid token), we continue 
                # (either it's a public endpoint or we'll block it below)
                pass

        # 3. Enforce endpoint protection for "write" operations under /api/
        if request.path.startswith('/api/') and request.method not in permissions.SAFE_METHODS:
            # Check if this specific path is exempt (e.g. login/register)
            is_exempt = any(request.path == exempt_path for exempt_path in self.EXEMPT_POST_PATHS)
            
            user = getattr(request, 'user', None)
            if not is_exempt and (not user or not user.is_authenticated):
                return JsonResponse(
                    {"detail": "Authentication credentials were not provided or are invalid."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        return None
