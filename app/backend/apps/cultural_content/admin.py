from django.contrib import admin

from .models import CulturalContent, CulturalEvent, CulturalEventRecipe


@admin.register(CulturalContent)
class CulturalContentAdmin(admin.ModelAdmin):
    list_display = ('title', 'kind', 'region', 'is_active', 'created_at')
    list_filter = ('kind', 'is_active')
    search_fields = ('title', 'body', 'region')
    prepopulated_fields = {'slug': ('title',)}


class CulturalEventRecipeInline(admin.TabularInline):
    model = CulturalEventRecipe
    extra = 1
    raw_id_fields = ('recipe',)


@admin.register(CulturalEvent)
class CulturalEventAdmin(admin.ModelAdmin):
    list_display = ('name', 'date_rule', 'region', 'created_at')
    list_filter = ('region',)
    search_fields = ('name', 'description')
    inlines = [CulturalEventRecipeInline]


@admin.register(CulturalEventRecipe)
class CulturalEventRecipeAdmin(admin.ModelAdmin):
    list_display = ('event', 'recipe', 'created_at')
    list_filter = ('event',)
    search_fields = ('event__name', 'recipe__title')
    raw_id_fields = ('event', 'recipe')
