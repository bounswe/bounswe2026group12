from django.contrib import admin

from .models import CulturalPassport


@admin.register(CulturalPassport)
class CulturalPassportAdmin(admin.ModelAdmin):
    list_display = ('user', 'level', 'total_points', 'active_theme', 'updated_at')
    list_filter = ('level', 'active_theme')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
