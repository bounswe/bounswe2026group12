from rest_framework import serializers

from .models import CulturalContent


class CulturalContentCardSerializer(serializers.ModelSerializer):
    """Serializes CulturalContent to the shape consumed by the mobile/web cards."""

    id = serializers.SerializerMethodField()
    link = serializers.SerializerMethodField()

    class Meta:
        model = CulturalContent
        fields = ['id', 'kind', 'title', 'body', 'region', 'link']

    def get_id(self, obj):
        return f'dc-{obj.kind}-{obj.id}'

    def get_link(self, obj):
        if obj.link_kind and obj.link_id:
            return {'kind': obj.link_kind, 'id': obj.link_id}
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('region'):
            data.pop('region', None)
        if data.get('link') is None:
            data.pop('link', None)
        return data
