import json

from rest_framework import serializers
from .models import Draft

DRAFT_DATA_MAX_BYTES = 64 * 1024

class DraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Draft
        fields = ['id', 'target_type', 'target_id', 'data', 'updated_at', 'created_at']
        read_only_fields = ['updated_at', 'created_at']

    def validate_target_id(self, value):
        if value in ("", "null"):
            return None
        return value

    def validate_data(self, value):
        encoded = json.dumps(value, separators=(',', ':')).encode('utf-8')
        if len(encoded) > DRAFT_DATA_MAX_BYTES:
            raise serializers.ValidationError(
                f"Draft data must be at most {DRAFT_DATA_MAX_BYTES} bytes."
            )
        return value
