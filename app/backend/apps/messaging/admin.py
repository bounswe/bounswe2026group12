from django.contrib import admin

from .models import Message, Thread, ThreadParticipant


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ['id', 'last_message_at', 'last_message_preview', 'created_at']
    ordering = ['-last_message_at']
    readonly_fields = ['created_at', 'last_message_at']


@admin.register(ThreadParticipant)
class ThreadParticipantAdmin(admin.ModelAdmin):
    list_display = ['id', 'thread', 'user', 'last_read_at', 'joined_at']
    list_select_related = ['thread', 'user']
    readonly_fields = ['joined_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'thread', 'sender', 'is_deleted', 'created_at', 'body_preview']
    list_filter = ['is_deleted']
    list_select_related = ['thread', 'sender']
    readonly_fields = ['created_at', 'deleted_at']

    def body_preview(self, obj):
        if obj.is_deleted:
            return '[deleted]'
        return obj.body[:60]
    body_preview.short_description = 'Body'
