from django.contrib import admin

from .models import HelpItem, HelpSection, Language, Result, Text, UserText

admin.site.site_header = 'Foodgram Admin'
admin.site.site_title = 'Foodgram Admin'
admin.site.index_title = 'Управление проектом'


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'flag_emoji',
        'native_name',
        'name',
        'code',
        'sort_order',
    )
    search_fields = (
        'native_name',
        'name',
        'code',
    )
    ordering = ('sort_order', 'native_name')
    list_editable = ('sort_order',)
    fields = (
        'flag_emoji',
        'native_name',
        'name',
        'code',
        'sort_order',
    )


@admin.register(Text)
class TextAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'short_content',
        'language',
    )
    list_filter = ('language',)
    search_fields = ('content',)
    ordering = ('language__sort_order', 'id')
    list_editable = ('language',)
    fields = (
        'language',
        'content',
    )

    @admin.display(description='Текст')
    def short_content(self, obj):
        return (
            obj.content[:80] + '...'
            if len(obj.content) > 80
            else obj.content
        )


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'speed',
        'accuracy',
        'total_time',
        'language',
        'is_personal_text',
        'created_at',
    )
    list_filter = (
        'language',
        'is_personal_text',
        'created_at',
    )
    search_fields = (
        'user__username',
        'user__email',
        'training_text',
        'user_text__title',
    )
    readonly_fields = (
        'created_at',
        'words',
    )
    autocomplete_fields = ('user',)
    ordering = ('-created_at',)
    fieldsets = (
        (
            'Основное',
            {
                'fields': (
                    'user',
                    'speed',
                    'accuracy',
                    'total_time',
                    'language',
                    'is_personal_text',
                    'user_text',
                    'created_at',
                )
            },
        ),
        (
            'Текст тренировки',
            {
                'fields': ('training_text',),
            },
        ),
        (
            'Статистика по словам',
            {
                'fields': ('words',),
            },
        ),
    )


@admin.register(UserText)
class UserTextAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'user',
        'updated_at',
    )
    search_fields = (
        'title',
        'content',
        'user__username',
        'user__email',
    )
    autocomplete_fields = ('user',)
    ordering = ('-updated_at', '-id')


class HelpItemInline(admin.TabularInline):
    model = HelpItem
    extra = 1
    ordering = ('sort_order', 'id')
    fields = (
        'text',
        'sort_order',
    )


@admin.register(HelpSection)
class HelpSectionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'sort_order',
    )
    search_fields = ('title',)
    list_editable = ('sort_order',)
    ordering = ('sort_order', 'id')
    inlines = (HelpItemInline,)


@admin.register(HelpItem)
class HelpItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'text',
        'section',
        'sort_order',
    )
    list_filter = ('section',)
    search_fields = (
        'text',
        'section__title',
    )
    list_editable = (
        'section',
        'sort_order',
    )
    ordering = ('section__sort_order', 'sort_order', 'id')
