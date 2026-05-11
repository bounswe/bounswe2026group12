from rest_framework import serializers

from .models import CulturalPassport


# Stable level -> display name mapping. Keep in sync with #587 when the real
# level/points logic lands. Frontend reads `stats.level_name` for the header
# label so the keys here must not be renamed without coordination.
LEVEL_NAMES = {
    1: 'Curious Traveler',
    2: 'Eager Explorer',
    3: 'Cultural Scout',
    4: 'Heritage Steward',
    5: 'Culinary Sage',
    6: 'Grand Storykeeper',
}


class CulturalPassportSerializer(serializers.ModelSerializer):
    """Public passport payload for GET /api/users/<username>/passport/ (#583).

    Response shape is stable even when downstream tables (Stamp #584,
    Quest #586, Timeline #588) and real points logic (#587) are not in place
    yet. Frontend can ship against this contract today.
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
        # TODO(#587): replace zeros with real counts once the tracking
        # relations (recipes_tried, stories_saved, heritage_shared,
        # cultures_count) exist. For now we return stable zeros so the
        # frontend can render the section.
        return {
            'cultures_count': 0,
            'recipes_tried': 0,
            'stories_saved': 0,
            'heritage_shared': 0,
            'level_name': LEVEL_NAMES.get(obj.level, 'Curious Traveler'),
        }

    def get_stamps(self, obj):
        # TODO(#584): return earned Stamp records once the model lands.
        return []

    def get_culture_summaries(self, obj):
        # TODO(#587): aggregate per-culture activity once tracking exists.
        return []

    def get_timeline(self, obj):
        # TODO(#588): return TimelineEvent records once the model lands.
        return []

    def get_active_quests(self, obj):
        # TODO(#586): return active Quest records once the model lands.
        return []
