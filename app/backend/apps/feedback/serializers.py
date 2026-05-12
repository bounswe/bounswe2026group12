from rest_framework import serializers
from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['id', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'message': {'required': True, 'allow_blank': False}
        }

    def validate_message(self, value):
        trimmed_value = value.strip()
        if not trimmed_value:
            raise serializers.ValidationError("This field may not be blank.")
        
        if len(trimmed_value) < 2:
            raise serializers.ValidationError("Message must be at least 2 characters long.")
        
        if len(trimmed_value) > 2000:
            raise serializers.ValidationError("Message must be 2000 characters or fewer.")
        
        return trimmed_value

    def to_representation(self, instance):
        """
        Custom representation to keep payloads small.
        Requirement: body: { "id": , "created_at": } (no echo of the message).
        """
        return {
            'id': instance.id,
            'created_at': instance.created_at.isoformat() if instance.created_at else None
        }
