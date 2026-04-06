from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration (POST /api/auth/register/)."""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'bio', 'region', 'preferred_language']
        extra_kwargs = {
            'bio': {'required': False},
            'region': {'required': False},
            'preferred_language': {'required': False},
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login (POST /api/auth/login/)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')
        data['user'] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Read-only serializer for the current user's profile (GET /api/users/me/)."""

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'bio', 'region', 'preferred_language', 'role', 'created_at']
        read_only_fields = fields
