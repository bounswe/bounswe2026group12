import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from rest_framework import status, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)

class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Defense-in-depth authentication middleware.

    Verifies JWT tokens and attaches the authenticated user to the request
    before DRF views are executed. Also enforces endpoint protection for
    write operations under /api/ as a safety net.

    Note: DRF's own permission system (permission_classes, DEFAULT_PERMISSION_CLASSES)
    remains the primary enforcement layer. This middleware exists to catch cases
    where a view might accidentally omit permission_classes.
    """
    
    EXEMPT_POST_PATHS = [
        '/api/auth/register/',
        '/api/auth/login/',
        '/api/auth/refresh/',
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
            except Exception as e:
                # If authentication fails here (invalid token), we continue 
                # (either it's a public endpoint or we'll block it below)
                logger.warning(f"Error during JWT authentication: {e}")

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
