from django.contrib import admin
from .models import Notification, DeviceToken


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'actor', 'recipe', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('recipient__username', 'actor__username', 'recipe__title', 'message')
    readonly_fields = ('created_at',)


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'token', 'created_at', 'updated_at')
    search_fields = ('user__username', 'token')
    readonly_fields = ('created_at', 'updated_at')
