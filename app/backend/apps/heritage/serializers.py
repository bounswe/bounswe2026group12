from rest_framework import serializers

from .models import HeritageGroup


class HeritageGroupListSerializer(serializers.ModelSerializer):
    """List shape: id, name, and a member_count tally for browse views."""

    member_count = serializers.SerializerMethodField()

    class Meta:
        model = HeritageGroup
        fields = ['id', 'name', 'member_count']

    def get_member_count(self, obj):
        annotated = getattr(obj, 'member_count_annotated', None)
        if annotated is not None:
            return annotated
        return obj.memberships.count()


class HeritageGroupDetailSerializer(serializers.ModelSerializer):
    """Detail shape: full group + resolved members from Recipe and Story."""

    members = serializers.SerializerMethodField()

    class Meta:
        model = HeritageGroup
        fields = ['id', 'name', 'description', 'members']

    def get_members(self, obj):
        memberships = list(
            obj.memberships
            .select_related('content_type')
            .order_by('content_type', 'object_id')
        )
        if not memberships:
            return []

        # Group object ids per content type so we can batch-resolve targets
        # and avoid a per-membership query.
        by_ct = {}
        for membership in memberships:
            by_ct.setdefault(membership.content_type, []).append(membership.object_id)

        resolved = {}
        for content_type, ids in by_ct.items():
            model = content_type.model_class()
            if model is None:
                continue
            qs = model.objects.filter(pk__in=ids)
            if hasattr(model, 'region'):
                qs = qs.select_related('region')
            if hasattr(model, 'author'):
                qs = qs.select_related('author')
            for obj_ in qs:
                resolved[(content_type.id, obj_.pk)] = obj_

        members = []
        for membership in memberships:
            obj_ = resolved.get((membership.content_type_id, membership.object_id))
            if obj_ is None:
                continue
            region = getattr(obj_, 'region', None)
            author = getattr(obj_, 'author', None)
            members.append({
                'content_type': membership.content_type.model,
                'id': obj_.pk,
                'title': getattr(obj_, 'title', ''),
                'author': getattr(author, 'username', None) if author else None,
                'region': region.name if region else None,
                'latitude': region.latitude if region else None,
                'longitude': region.longitude if region else None,
            })
        return members
