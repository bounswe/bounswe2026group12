from django.contrib import admin
from .models import (
    Recipe, Ingredient, Unit, Region, RecipeIngredient, Comment,
    DietaryTag, EventTag, IngredientSubstitution, EndangeredNote,
    RecipeCulturalContext, IngredientRoute
)


class EndangeredNoteInline(admin.TabularInline):
    model = EndangeredNote
    extra = 0


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'created_at', 'is_published', 'is_heritage', 'heritage_status')
    list_filter = ('is_published', 'is_heritage', 'heritage_status')
    inlines = [EndangeredNoteInline]

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_approved', 'density_g_per_ml', 'heritage_status')
    list_filter = ('is_approved', 'heritage_status')
    search_fields = ('name',)

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_approved')

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'latitude', 'longitude')
    list_select_related = ('parent',)
    search_fields = ('name',)
    fieldsets = (
        (None, {
            'fields': ('name', 'parent'),
        }),
        ('Geographic Center', {
            'description': 'Coordinates used for map pin placement.',
            'fields': ('latitude', 'longitude'),
        }),
        ('Bounding Box (optional)', {
            'description': 'Used for viewport-bounded discovery queries.',
            'classes': ('collapse',),
            'fields': ('bbox_north', 'bbox_south', 'bbox_east', 'bbox_west'),
        }),
    )

@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'ingredient', 'amount', 'unit')

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipe', 'author', 'type', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('body', 'author__username', 'recipe__title')

@admin.register(DietaryTag)
class DietaryTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_approved')

@admin.register(EventTag)
class EventTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_approved')

@admin.register(IngredientSubstitution)
class IngredientSubstitutionAdmin(admin.ModelAdmin):
    list_display = ('from_ingredient', 'to_ingredient', 'match_type', 'closeness')
    list_filter = ('match_type',)
    search_fields = ('from_ingredient__name', 'to_ingredient__name')

@admin.register(EndangeredNote)
class EndangeredNoteAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'source_url', 'created_at')
    search_fields = ('recipe__title', 'text')

@admin.register(RecipeCulturalContext)
class RecipeCulturalContextAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'identity_note', 'memory_note')
    search_fields = ('recipe__title', 'identity_note', 'memory_note')


@admin.register(IngredientRoute)
class IngredientRouteAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'waypoint_count', 'created_at')
    search_fields = ('ingredient__name',)
    list_filter = ('created_at',)

    def waypoint_count(self, obj):
        return len(obj.waypoints) if isinstance(obj.waypoints, list) else 0

    waypoint_count.short_description = 'Waypoints'

