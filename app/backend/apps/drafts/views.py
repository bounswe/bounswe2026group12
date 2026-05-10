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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        draft, created = Draft.objects.update_or_create(
            user=request.user,
            target_type=validated_data['target_type'],
            target_id=validated_data.get('target_id'),
            defaults={'data': validated_data['data']}
        )

        serializer = self.get_serializer(draft)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
