from django.contrib import admin
from .models import Feedback

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'short_message', 'user', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('message', 'user_agent', 'path')
    readonly_fields = ('user', 'message', 'created_at', 'user_agent', 'path')
    
    # Ensure they can only view, not edit existing messages through the UI
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_add_permission(self, request):
        return False
