from rest_framework import serializers
from .models import Notification, DeviceToken


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.ReadOnlyField(source='actor.username')
    recipe_title = serializers.ReadOnlyField(source='recipe.title')

    class Meta:
        model = Notification
        fields = [
            'id', 'actor', 'actor_username', 'recipe', 'recipe_title',
            'message', 'notification_type', 'is_read', 'created_at',
        ]
        read_only_fields = ['actor', 'recipe', 'message', 'notification_type', 'created_at']


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'token', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
