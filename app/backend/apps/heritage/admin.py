from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from .models import HeritageGroup, HeritageGroupMembership


def _heritage_target_ct_q():
    """Limit the content_type picker to Recipe and Story only.

    Lazily resolved so this module stays import-safe when the database is
    empty (e.g. during tests before migrations).
    """
    from django.db.models import Q
    return Q(app_label='recipes', model='recipe') | Q(app_label='stories', model='story')


class HeritageGroupMembershipInline(admin.TabularInline):
    """Inline shown on the HeritageGroup admin page.

    Curators pick the content type (Recipe or Story) and the object id
    directly when attaching members. The content_type queryset is filtered
    to keep the dropdown short and avoid foot-guns.
    """

    model = HeritageGroupMembership
    extra = 0
    fields = ('content_type', 'object_id', 'created_at')
    readonly_fields = ('created_at',)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'content_type':
            from django.contrib.contenttypes.models import ContentType
            kwargs['queryset'] = ContentType.objects.filter(_heritage_target_ct_q())
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class HeritageGroupMembershipGenericInline(GenericTabularInline):
    """Inline mounted on Recipe / Story admin pages so curators can attach
    a single object to multiple HeritageGroups from the object's own page.

    Not registered by default to avoid forcing edits on the recipes / stories
    admin classes; downstream apps can opt in by adding it to their inlines.
    """

    model = HeritageGroupMembership
    extra = 0
    fields = ('heritage_group',)


@admin.register(HeritageGroup)
class HeritageGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'member_count', 'created_at')
    search_fields = ('name',)
    inlines = [HeritageGroupMembershipInline]

    def member_count(self, obj):
        return obj.memberships.count()

    member_count.short_description = 'Members'


@admin.register(HeritageGroupMembership)
class HeritageGroupMembershipAdmin(admin.ModelAdmin):
    list_display = ('heritage_group', 'content_type', 'object_id', 'created_at')
    list_filter = ('content_type', 'heritage_group')
    search_fields = ('heritage_group__name',)
