"""Cultural tag moderation queue (#391, M5-25).

Backs the admin UI for reviewing user-submitted EventTag, Region, and
Religion entries. The submission flow itself lives on the per-type
ModeratedLookupViewSet in apps/recipes; this module adds the unified
queue, approve, and reject surfaces on top.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.recipes.models import EventTag, Region, Religion


# Type discriminator → (Model, human label) used across queue, approve, reject.
# Keep keys lowercase and stable; they appear in URLs and response payloads.
CULTURAL_TAG_TYPES = {
    'event': (EventTag, 'event'),
    'region': (Region, 'region'),
    'religion': (Religion, 'religion'),
}


class CulturalTagModerationItemSerializer(serializers.Serializer):
    """Unified row shape across cultural tag types.

    Includes audit metadata so the admin UI can render submitter context
    and rejection history without making per-type lookups. The discriminator
    `type` is supplied via serializer context (`type_key`) so this same shape
    works across EventTag/Region/Religion without each model needing a
    `type` attribute.
    """
    type = serializers.SerializerMethodField()
    id = serializers.IntegerField()
    name = serializers.CharField()
    is_approved = serializers.BooleanField()
    rejection_reason = serializers.CharField(allow_blank=True)
    submitted_at = serializers.DateTimeField(allow_null=True)
    submitted_by = serializers.SerializerMethodField()
    reviewed_at = serializers.DateTimeField(allow_null=True)
    reviewed_by = serializers.SerializerMethodField()

    def _user_repr(self, user):
        if user is None:
            return None
        return {'id': user.id, 'username': user.username}

    def get_type(self, obj):
        return self.context.get('type_key')

    def get_submitted_by(self, obj):
        return self._user_repr(getattr(obj, 'submitted_by', None))

    def get_reviewed_by(self, obj):
        return self._user_repr(getattr(obj, 'reviewed_by', None))


def _serialize_row(model_key, instance):
    """Wrap a model instance in the unified moderation row shape."""
    return CulturalTagModerationItemSerializer(
        instance, context={'type_key': model_key},
    ).data


def _filter_by_status(qs, status_param):
    """Filter a cultural-tag queryset by the queue status discriminator.

    pending  → is_approved=False AND no reviewed_at (never decided)
    rejected → is_approved=False AND reviewed_at IS NOT NULL (admin rejected)
    approved → is_approved=True
    """
    if status_param == 'pending':
        return qs.filter(is_approved=False, reviewed_at__isnull=True)
    if status_param == 'rejected':
        return qs.filter(is_approved=False, reviewed_at__isnull=False)
    if status_param == 'approved':
        return qs.filter(is_approved=True)
    return qs


class CulturalTagModerationQueueView(APIView):
    """GET /api/moderation/cultural-tags/

    Admin-only listing of cultural tag submissions across types.

    Query params:
        status (str): pending | approved | rejected (default: pending)
        type   (str): event | region | religion (default: all types)
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        status_param = request.query_params.get('status', 'pending').strip().lower()
        type_param = request.query_params.get('type', '').strip().lower()

        if status_param not in {'pending', 'approved', 'rejected'}:
            return Response(
                {'detail': "Invalid status. Use 'pending', 'approved', or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if type_param and type_param not in CULTURAL_TAG_TYPES:
            return Response(
                {'detail': f"Invalid type. Use one of: {', '.join(CULTURAL_TAG_TYPES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        types_to_include = [type_param] if type_param else list(CULTURAL_TAG_TYPES)

        rows = []
        for key in types_to_include:
            Model, _label = CULTURAL_TAG_TYPES[key]
            qs = (
                Model.objects
                .select_related('submitted_by', 'reviewed_by')
                .order_by('-submitted_at', '-id')
            )
            qs = _filter_by_status(qs, status_param)
            for obj in qs:
                rows.append(_serialize_row(key, obj))

        # Stable ordering across types: most recent submissions first.
        rows.sort(key=lambda r: (r.get('submitted_at') or '', r['id']), reverse=True)

        return Response({
            'status': status_param,
            'type': type_param or None,
            'count': len(rows),
            'results': rows,
        })


class CulturalTagModerationActionView(APIView):
    """POST /api/moderation/cultural-tags/<type>/<id>/approve|reject/

    Admin-only mutation surface. Approve flips is_approved=True; reject
    captures the reason and stamps reviewed_by/reviewed_at without
    modifying is_approved (which stays False).
    """
    permission_classes = [permissions.IsAdminUser]
    action = None  # 'approve' or 'reject', set by URL conf

    def post(self, request, type_key, pk):
        type_key = type_key.lower()
        if type_key not in CULTURAL_TAG_TYPES:
            return Response(
                {'detail': f"Invalid type. Use one of: {', '.join(CULTURAL_TAG_TYPES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Model, _label = CULTURAL_TAG_TYPES[type_key]
        instance = get_object_or_404(Model, pk=pk)

        now = timezone.now()
        if self.action == 'approve':
            instance.is_approved = True
            instance.reviewed_by = request.user
            instance.reviewed_at = now
            # Approvals clear any prior rejection reason so the audit trail
            # reflects the current decision, not a stale one.
            instance.rejection_reason = ''
            instance.save(update_fields=[
                'is_approved', 'reviewed_by', 'reviewed_at', 'rejection_reason',
            ])
        elif self.action == 'reject':
            reason = request.data.get('reason', '')
            if not isinstance(reason, str):
                return Response(
                    {'reason': ['Must be a string.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            instance.is_approved = False
            instance.reviewed_by = request.user
            instance.reviewed_at = now
            instance.rejection_reason = reason.strip()
            instance.save(update_fields=[
                'is_approved', 'reviewed_by', 'reviewed_at', 'rejection_reason',
            ])
        else:
            return Response(
                {'detail': 'Unsupported moderation action.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(_serialize_row(type_key, instance), status=status.HTTP_200_OK)
