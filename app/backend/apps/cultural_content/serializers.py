from rest_framework import serializers

from .models import CulturalContent


class CulturalContentCardSerializer(serializers.ModelSerializer):
    """Serializes CulturalContent to the shape consumed by the mobile/web cards.

    The `region` field is output as a plain string (region name) to preserve
    backward compatibility with existing frontend consumers. The backend stores
    it as a FK internally (added in #381), but consumers see no change.
    """

    id = serializers.SerializerMethodField()
    link = serializers.SerializerMethodField()
    # Output region as a string name for backward compatibility.
    # Internally region is now a FK; SlugRelatedField serialises it to name.
    region = serializers.SerializerMethodField()

    class Meta:
        model = CulturalContent
        fields = ['id', 'kind', 'title', 'body', 'region', 'link']

    def get_id(self, obj):
        return f'dc-{obj.kind}-{obj.id}'

    def get_link(self, obj):
        if obj.link_kind and obj.link_id:
            return {'kind': obj.link_kind, 'id': obj.link_id}
        return None

    def get_region(self, obj):
        """Return region as a name string regardless of whether it's an FK or text."""
        if obj.region_id:
            return obj.region.name
        # Fallback to legacy free-text value
        return obj.region_text or None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('region'):
            data.pop('region', None)
        if data.get('link') is None:
            data.pop('link', None)
        return data
