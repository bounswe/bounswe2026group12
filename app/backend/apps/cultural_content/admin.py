from django.contrib import admin

from .models import CulturalContent


@admin.register(CulturalContent)
class CulturalContentAdmin(admin.ModelAdmin):
    list_display = ('title', 'kind', 'region', 'is_active', 'created_at')
    list_filter = ('kind', 'is_active')
    search_fields = ('title', 'body', 'region')
    prepopulated_fields = {'slug': ('title',)}
