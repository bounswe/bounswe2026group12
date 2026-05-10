from rest_framework import serializers
from .models import Draft

class DraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Draft
        fields = ['id', 'target_type', 'target_id', 'data', 'updated_at', 'created_at']
        read_only_fields = ['updated_at', 'created_at']
