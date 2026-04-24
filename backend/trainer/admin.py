from datetime import timedelta

from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    HelpItem,
    HelpSection,
    Language,
    Result,
    Text,
    TrainingSession,
    UserText,
)

admin.site.site_header = 'Typing Trainer Admin'
admin.site.site_title = 'Typing Trainer Admin'
admin.site.index_title = 'Управление проектом'


class ResultInline(admin.TabularInline):
    model = Result
    extra = 0
    can_delete = False
    show_change_link = True
    fields = (
        'user',
        'speed',
        'accuracy',
        'created_at',
    )
    readonly_fields = fields
    ordering = ('-created_at',)


class HelpItemInline(admin.TabularInline):
    model = HelpItem
    extra = 0
    ordering = ('sort_order', 'id')
    fields = ('text', 'sort_order')


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'flag_emoji',
        'native_name',
        'name',
        'code',
        'sort_order',
        'texts_total',
        'results_total',
        'sessions_total',
    )
    search_fields = ('native_name', 'name', 'code')
    ordering = ('sort_order', 'native_name')
    list_editable = ('sort_order',)
    fields = (
        'flag_emoji',
        'native_name',
        'name',
        'code',
        'sort_order',
    )
    inlines = (ResultInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('texts', 'results', 'training_sessions')

    @admin.display(description='Текстов')
    def texts_total(self, obj):
        return obj.texts.count()

    @admin.display(description='Результатов')
    def results_total(self, obj):
        return obj.results.count()

    @admin.display(description='Сессий')
    def sessions_total(self, obj):
        return obj.training_sessions.count()


@admin.register(Text)
class TextAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'language',
        'word_count',
        'short_content',
    )
    list_filter = ('language',)
    search_fields = ('content',)
    ordering = ('language__sort_order', 'id')
    list_select_related = ('language',)
    readonly_fields = ('word_count',)
    fields = ('language', 'word_count', 'content')
    list_per_page = 50

    @admin.display(description='Слов')
    def word_count(self, obj):
        return len((obj.content or '').split())

    @admin.display(description='Текст')
    def short_content(self, obj):
        return (obj.content[:120] + '...') if len(obj.content) > 120 else obj.content


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'speed',
        'accuracy',
        'total_time',
        'language',
        'text_source',
        'words_total',
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
        'training_excerpt',
        'words_total',
    )
    autocomplete_fields = ('user', 'user_text', 'language')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    list_per_page = 100
    actions = ('mark_as_personal', 'mark_as_common')
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
                'fields': ('training_excerpt', 'training_text'),
            },
        ),
        (
            'Статистика по словам',
            {
                'fields': ('words_total', 'words'),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'language', 'user_text')

    @admin.display(description='Источник')
    def text_source(self, obj):
        if obj.user_text_id:
            return f'UserText: {obj.user_text.title}'
        return 'Базовый текст'

    @admin.display(description='Слов в JSON')
    def words_total(self, obj):
        return len(obj.words or [])

    @admin.display(description='Превью текста')
    def training_excerpt(self, obj):
        return (obj.training_text[:250] + '...') if len(obj.training_text) > 250 else obj.training_text

    @admin.action(description='Пометить как личные тексты')
    def mark_as_personal(self, request, queryset):
        updated = queryset.update(is_personal_text=True)
        self.message_user(request, f'Обновлено результатов: {updated}', level=messages.SUCCESS)

    @admin.action(description='Снять пометку личного текста')
    def mark_as_common(self, request, queryset):
        updated = queryset.update(is_personal_text=False)
        self.message_user(request, f'Обновлено результатов: {updated}', level=messages.WARNING)


@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'token_short',
        'user',
        'language',
        'mode',
        'text_type',
        'is_personal_text',
        'status_badge',
        'created_at',
        'expires_at',
    )
    list_filter = (
        'mode',
        'text_type',
        'is_personal_text',
        'language',
        'created_at',
        'expires_at',
        'completed_at',
    )
    search_fields = (
        'token',
        'user__username',
        'user__email',
        'training_text',
        'user_text__title',
        'client_fingerprint',
    )
    readonly_fields = (
        'token',
        'token_short',
        'client_fingerprint',
        'training_excerpt',
        'created_at',
        'status_badge',
    )
    autocomplete_fields = ('user', 'language', 'user_text')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    list_per_page = 100
    actions = ('mark_completed_now', 'extend_expiry_by_hour')
    fieldsets = (
        (
            'Основное',
            {
                'fields': (
                    'token',
                    'token_short',
                    'user',
                    'language',
                    'user_text',
                    'mode',
                    'text_type',
                    'requested_size',
                    'is_personal_text',
                    'client_fingerprint',
                    'status_badge',
                ),
            },
        ),
        (
            'Содержимое',
            {
                'fields': ('training_excerpt', 'training_text'),
            },
        ),
        (
            'Тайминг',
            {
                'fields': (
                    'started_at',
                    'completed_at',
                    'expires_at',
                    'created_at',
                ),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'language', 'user_text')

    @admin.display(description='Токен')
    def token_short(self, obj):
        return f'{str(obj.token)[:8]}...'

    @admin.display(description='Статус')
    def status_badge(self, obj):
        now = timezone.now()
        if obj.completed_at:
            color = '#7ddc8a'
            label = 'Завершена'
        elif obj.expires_at <= now:
            color = '#ff7f7f'
            label = 'Истекла'
        elif obj.started_at:
            color = '#f0b44c'
            label = 'В процессе'
        else:
            color = '#9ea3ff'
            label = 'Создана'
        return format_html('<span style="color:{}; font-weight:600;">{}</span>', color, label)

    @admin.display(description='Превью текста')
    def training_excerpt(self, obj):
        return (obj.training_text[:250] + '...') if len(obj.training_text) > 250 else obj.training_text

    @admin.action(description='Пометить выбранные сессии завершенными сейчас')
    def mark_completed_now(self, request, queryset):
        updated = queryset.update(completed_at=timezone.now())
        self.message_user(request, f'Завершено сессий: {updated}', level=messages.SUCCESS)

    @admin.action(description='Продлить срок выбранных сессий на 1 час')
    def extend_expiry_by_hour(self, request, queryset):
        updated = 0
        for session in queryset:
            session.expires_at = max(session.expires_at, timezone.now()) + timedelta(hours=1)
            session.save(update_fields=['expires_at'])
            updated += 1
        self.message_user(request, f'Продлено сессий: {updated}', level=messages.SUCCESS)


@admin.register(UserText)
class UserTextAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'user',
        'word_count',
        'results_total',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'title',
        'content',
        'user__username',
        'user__email',
    )
    list_filter = ('created_at', 'updated_at')
    autocomplete_fields = ('user',)
    ordering = ('-updated_at', '-id')
    readonly_fields = ('created_at', 'updated_at', 'word_count', 'content_excerpt')
    fieldsets = (
        (
            'Основное',
            {
                'fields': ('user', 'title', 'word_count', 'created_at', 'updated_at'),
            },
        ),
        (
            'Текст',
            {
                'fields': ('content_excerpt', 'content'),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user').prefetch_related('results')

    @admin.display(description='Слов')
    def word_count(self, obj):
        return len((obj.content or '').split())

    @admin.display(description='Результатов')
    def results_total(self, obj):
        return obj.results.count()

    @admin.display(description='Превью')
    def content_excerpt(self, obj):
        return (obj.content[:250] + '...') if len(obj.content) > 250 else obj.content


@admin.register(HelpSection)
class HelpSectionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'sort_order',
        'items_total',
    )
    search_fields = ('title',)
    list_editable = ('sort_order',)
    ordering = ('sort_order', 'id')
    inlines = (HelpItemInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('items')

    @admin.display(description='Подсказок')
    def items_total(self, obj):
        return obj.items.count()


@admin.register(HelpItem)
class HelpItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'short_text',
        'section',
        'sort_order',
    )
    list_filter = ('section',)
    search_fields = ('text', 'section__title')
    list_editable = ('section', 'sort_order')
    ordering = ('section__sort_order', 'sort_order', 'id')
    list_select_related = ('section',)

    @admin.display(description='Текст')
    def short_text(self, obj):
        return (obj.text[:120] + '...') if len(obj.text) > 120 else obj.text
