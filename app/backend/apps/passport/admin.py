from django.contrib import admin

from .models import (
    CulturalPassport,
    PassportEvent,
    Quest,
    Stamp,
    StampInteraction,
    UserQuest,
)


@admin.register(CulturalPassport)
class CulturalPassportAdmin(admin.ModelAdmin):
    list_display = ('user', 'level', 'total_points', 'active_theme', 'updated_at')
    list_filter = ('level', 'active_theme')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Stamp)
class StampAdmin(admin.ModelAdmin):
    list_display = ('user', 'culture', 'category', 'rarity', 'earned_at')
    list_filter = ('rarity', 'category', 'culture')
    search_fields = ('user__username', 'culture')
    raw_id_fields = ('user', 'source_recipe', 'source_story')
    readonly_fields = ('earned_at',)


@admin.register(StampInteraction)
class StampInteractionAdmin(admin.ModelAdmin):
    list_display = ('user', 'culture', 'kind', 'category', 'created_at')
    list_filter = ('kind', 'category', 'culture')
    search_fields = ('user__username', 'culture')
    raw_id_fields = ('user', 'recipe', 'story')
    readonly_fields = ('created_at',)


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    # All fields editable so quest content can be authored entirely from here.
    list_display = (
        'name', 'category', 'target_count', 'reward_type', 'reward_value',
        'is_event_quest', 'event_start', 'event_end',
    )
    list_filter = ('category', 'reward_type', 'is_event_quest')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at',)


@admin.register(UserQuest)
class UserQuestAdmin(admin.ModelAdmin):
    list_display = ('user', 'quest', 'progress', 'completed_at', 'reward_claimed')
    list_filter = ('reward_claimed', 'quest__category')
    search_fields = ('user__username', 'quest__name')
    raw_id_fields = ('user', 'quest')
    readonly_fields = ('created_at',)


@admin.register(PassportEvent)
class PassportEventAdmin(admin.ModelAdmin):
    list_display = ('user', 'event_type', 'description', 'timestamp', 'stamp_rarity')
    list_filter = ('event_type', 'stamp_rarity')
    search_fields = ('user__username', 'description')
    raw_id_fields = ('user', 'related_recipe', 'related_story')
