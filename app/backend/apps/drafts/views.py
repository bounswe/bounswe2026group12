from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Draft
from .serializers import DraftSerializer

class DraftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user drafts.
    Drafts are private to the user.
    """
    serializer_class = DraftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Draft.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Upsert a draft: update if exists, otherwise create.
        """
        target_type = request.data.get('target_type')
        target_id = request.data.get('target_id')
        data = request.data.get('data')

        if not target_type or data is None:
            return Response(
                {"detail": "target_type and data are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Normalize target_id for the lookup
        # Empty string or explicit null should be treated as None
        if target_id == "" or target_id == "null":
            target_id = None

        draft, created = Draft.objects.update_or_create(
            user=request.user,
            target_type=target_type,
            target_id=target_id,
            defaults={'data': data}
        )

        serializer = self.get_serializer(draft)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
