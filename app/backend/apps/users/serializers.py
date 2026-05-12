from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'bio', 'region', 'preferred_language']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        data['user'] = user
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    bookmark_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'bio', 'region', 'preferred_language', 'role', 'created_at',
            'cultural_interests', 'regional_ties', 'religious_preferences', 'event_interests',
            'is_contactable', 'bookmark_count',
        ]
        read_only_fields = [
            'id', 'email', 'username', 'role', 'created_at',
        ]

    def get_bookmark_count(self, obj):
        return obj.bookmarks.count()


class PublicUserSerializer(serializers.ModelSerializer):
    """Public-facing user profile (#582).

    Excludes sensitive fields (email, is_contactable, password) so the same
    payload is safe to return to anonymous visitors. `recipe_count` and
    `story_count` reflect published content only.
    """
    recipe_count = serializers.SerializerMethodField()
    story_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'username',
            'bio',
            'region',
            'cultural_interests',
            'religious_preferences',
            'event_interests',
            'created_at',
            'recipe_count',
            'story_count',
        ]

    def get_recipe_count(self, obj):
        return obj.recipes.filter(is_published=True).count()

    def get_story_count(self, obj):
        return obj.stories.filter(is_published=True).count()


class StringTagListField(serializers.ListField):
    """List of string tags; rejects non-string items instead of coercing."""

    def __init__(self, **kwargs):
        kwargs.setdefault('child', serializers.CharField(max_length=100))
        kwargs.setdefault('required', False)
        kwargs.setdefault('allow_empty', True)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if isinstance(data, list):
            for item in data:
                if not isinstance(item, str):
                    raise serializers.ValidationError(['All items must be strings.'])
        return super().to_internal_value(data)


class UserPreferencesUpdateSerializer(serializers.ModelSerializer):
    """Self-service update for `PATCH /api/users/me/`.

    Covers cultural-onboarding tags, contactability, and basic profile fields
    (#659). Privilege-sensitive fields (email, role, is_staff, is_superuser)
    are intentionally excluded so they cannot be changed through this endpoint.
    All fields are optional; the view uses partial updates.
    """
    cultural_interests = StringTagListField()
    regional_ties = StringTagListField()
    religious_preferences = StringTagListField()
    event_interests = StringTagListField()

    class Meta:
        model = User
        fields = [
            'cultural_interests', 'regional_ties', 'religious_preferences', 'event_interests',
            'is_contactable',
            'username', 'bio', 'region', 'preferred_language',
        ]

    def validate_username(self, value):
        qs = User.objects.filter(username__iexact=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('This username is already taken.')
        return value
