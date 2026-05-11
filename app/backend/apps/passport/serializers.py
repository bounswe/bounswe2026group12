from rest_framework import serializers

from . import services
from .models import CulturalPassport, PassportEvent, Stamp, UserQuest

# Re-exported so callers (and the existing #583 tests) can import the canonical
# level name table from here. Defined in services.py alongside the thresholds.
LEVEL_NAMES = services.LEVEL_NAMES


class StampSerializer(serializers.ModelSerializer):
    source_recipe = serializers.PrimaryKeyRelatedField(read_only=True)
    source_story = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Stamp
        fields = [
            'id', 'culture', 'category', 'rarity', 'earned_at',
            'source_recipe', 'source_story',
        ]


class PassportEventSerializer(serializers.ModelSerializer):
    related_recipe = serializers.PrimaryKeyRelatedField(read_only=True)
    related_story = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PassportEvent
        fields = [
            'id', 'event_type', 'description', 'timestamp',
            'related_recipe', 'related_story', 'stamp_rarity',
        ]


class QuestProgressSerializer(serializers.Serializer):
    """Serializes the plain dicts returned by services.quests_with_progress."""

    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    target_count = serializers.IntegerField()
    reward_type = serializers.CharField()
    reward_value = serializers.CharField()
    is_event_quest = serializers.BooleanField()
    event_start = serializers.DateTimeField(allow_null=True)
    event_end = serializers.DateTimeField(allow_null=True)
    progress = serializers.IntegerField()
    completed_at = serializers.DateTimeField(allow_null=True)
    reward_claimed = serializers.BooleanField()


class UserQuestSerializer(serializers.ModelSerializer):
    """Used for the "newly completed quests" list in action responses."""

    name = serializers.CharField(source='quest.name', read_only=True)
    category = serializers.CharField(source='quest.category', read_only=True)
    target_count = serializers.IntegerField(source='quest.target_count', read_only=True)
    reward_type = serializers.CharField(source='quest.reward_type', read_only=True)
    reward_value = serializers.CharField(source='quest.reward_value', read_only=True)

    class Meta:
        model = UserQuest
        fields = [
            'id', 'name', 'category', 'target_count', 'reward_type',
            'reward_value', 'progress', 'completed_at', 'reward_claimed',
        ]


class CulturalPassportSerializer(serializers.ModelSerializer):
    """Public passport payload for GET /api/users/<username>/passport/ (#583).

    The section keys are stable. `stamps`, `culture_summaries`, `timeline` and
    `active_quests` are now backed by the Stamp/Quest/PassportEvent tables;
    visitor mode includes all of them.
    """

    stats = serializers.SerializerMethodField()
    stamps = serializers.SerializerMethodField()
    culture_summaries = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    active_quests = serializers.SerializerMethodField()

    class Meta:
        model = CulturalPassport
        fields = [
            'level',
            'total_points',
            'active_theme',
            'stats',
            'stamps',
            'culture_summaries',
            'timeline',
            'active_quests',
        ]

    def get_stats(self, obj):
        stats = services.passport_stats(obj.user)
        stats['level_name'] = LEVEL_NAMES.get(obj.level, LEVEL_NAMES[1])
        return stats

    def get_stamps(self, obj):
        stamps = Stamp.objects.filter(user=obj.user)
        return StampSerializer(stamps, many=True).data

    def get_culture_summaries(self, obj):
        return services.culture_summaries(obj.user)

    def get_timeline(self, obj):
        events = PassportEvent.objects.filter(user=obj.user)[:50]
        return PassportEventSerializer(events, many=True).data

    def get_active_quests(self, obj):
        return QuestProgressSerializer(
            services.quests_with_progress(obj.user), many=True,
        ).data
