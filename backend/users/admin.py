from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from django.utils.html import format_html

from .models import SessionToken, User


class SessionTokenInline(admin.TabularInline):
    model = SessionToken
    extra = 0
    can_delete = False
    show_change_link = True
    fields = (
        'token_type',
        'token_hash_short',
        'is_active_badge',
        'created_at',
        'last_used_at',
        'expires_at',
        'revoked_at',
    )
    readonly_fields = fields
    ordering = ('-created_at',)

    @admin.display(description='Токен')
    def token_hash_short(self, obj):
        return f'{obj.token_hash[:10]}...'

    @admin.display(description='Статус')
    def is_active_badge(self, obj):
        if obj.revoked_at:
            color = '#ff7f7f'
            label = 'Отозван'
        elif obj.expires_at <= timezone.now():
            color = '#f0b44c'
            label = 'Истек'
        else:
            color = '#7ddc8a'
            label = 'Активен'
        return format_html(
            '<span style="color:{}; font-weight:600;">{}</span>',
            color,
            label,
        )


@admin.register(User)
class AdminUser(UserAdmin):
    list_display = (
        'id',
        'avatar_thumb',
        'email',
        'username',
        'full_name',
        'country',
        'age',
        'results_total',
        'tokens_total',
        'is_active',
        'is_staff',
        'is_superuser',
        'date_joined',
    )
    search_fields = (
        'email',
        'username',
        'first_name',
        'last_name',
        'country',
    )
    list_filter = (
        'is_active',
        'is_staff',
        'is_superuser',
        'country',
        'groups',
        'date_joined',
    )
    ordering = ('-date_joined', 'id')
    list_per_page = 50
    date_hierarchy = 'date_joined'
    readonly_fields = (
        'last_login',
        'date_joined',
        'avatar_preview',
        'results_total',
        'tokens_total',
    )
    inlines = (SessionTokenInline,)
    actions = (
        'activate_users',
        'deactivate_users',
        'grant_staff',
        'revoke_staff',
        'revoke_all_tokens',
    )
    fieldsets = (
        (
            'Учетные данные',
            {
                'fields': ('email', 'username', 'password'),
            },
        ),
        (
            'Личная информация',
            {
                'fields': (
                    'first_name',
                    'last_name',
                    'country',
                    'age',
                    'avatar',
                    'avatar_preview',
                ),
            },
        ),
        (
            'Статистика',
            {
                'fields': ('results_total', 'tokens_total'),
            },
        ),
        (
            'Права доступа',
            {
                'fields': (
                    'is_active',
                    'is_staff',
                    'is_superuser',
                    'groups',
                    'user_permissions',
                ),
            },
        ),
        (
            'Даты',
            {
                'fields': ('last_login', 'date_joined'),
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': (
                    'email',
                    'username',
                    'first_name',
                    'last_name',
                    'age',
                    'country',
                    'password1',
                    'password2',
                    'is_active',
                    'is_staff',
                    'is_superuser',
                ),
            },
        ),
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.prefetch_related('results', 'session_tokens')

    @admin.display(description='Аватар')
    def avatar_thumb(self, obj):
        if not obj.avatar:
            return '—'
        return format_html(
            '<img src="{}" style="width:40px; height:40px; object-fit:cover; border-radius:10px;" />',
            obj.avatar.url,
        )

    @admin.display(description='Полное имя')
    def full_name(self, obj):
        full_name = f'{obj.first_name} {obj.last_name}'.strip()
        return full_name or '—'

    @admin.display(description='Превью аватара')
    def avatar_preview(self, obj):
        if not obj.avatar:
            return 'Аватар не загружен'
        return format_html(
            '<img src="{}" style="max-width:140px; max-height:140px; border-radius:18px; object-fit:cover;" />',
            obj.avatar.url,
        )

    @admin.display(description='Тренировок')
    def results_total(self, obj):
        return obj.results.count()

    @admin.display(description='Токенов')
    def tokens_total(self, obj):
        return obj.session_tokens.count()

    @admin.display(boolean=True, description='Верифицирован')
    def is_verified(self, obj):
        return obj.is_active and obj.last_login is not None

    @admin.action(description='Активировать выбранных пользователей')
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'Активировано пользователей: {updated}',
            level=messages.SUCCESS,
        )

    @admin.action(description='Деактивировать выбранных пользователей')
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'Деактивировано пользователей: {updated}',
            level=messages.WARNING,
        )

    @admin.action(description='Выдать staff выбранным пользователям')
    def grant_staff(self, request, queryset):
        updated = queryset.update(is_staff=True)
        self.message_user(
            request,
            f'Staff выдан пользователям: {updated}',
            level=messages.SUCCESS,
        )

    @admin.action(description='Забрать staff у выбранных пользователей')
    def revoke_staff(self, request, queryset):
        updated = queryset.update(is_staff=False)
        self.message_user(
            request,
            f'Staff отключен у пользователей: {updated}',
            level=messages.WARNING,
        )

    @admin.action(description='Отозвать все токены выбранных пользователей')
    def revoke_all_tokens(self, request, queryset):
        updated = SessionToken.objects.filter(
            user__in=queryset,
            revoked_at__isnull=True,
        ).update(revoked_at=timezone.now())
        self.message_user(
            request,
            f'Отозвано токенов: {updated}',
            level=messages.WARNING,
        )


@admin.register(SessionToken)
class SessionTokenAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'token_type',
        'token_hash_short',
        'status_badge',
        'created_at',
        'last_used_at',
        'expires_at',
        'revoked_at',
    )
    list_filter = (
        'token_type',
        'created_at',
        'expires_at',
        'revoked_at',
    )
    search_fields = (
        'user__email',
        'user__username',
        'token_hash',
    )
    readonly_fields = (
        'user',
        'token_type',
        'token_hash',
        'created_at',
        'last_used_at',
        'expires_at',
        'revoked_at',
        'status_badge',
    )
    autocomplete_fields = ('user',)
    ordering = ('-created_at',)
    list_per_page = 100
    date_hierarchy = 'created_at'
    actions = ('revoke_selected_tokens',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

    @admin.display(description='Токен')
    def token_hash_short(self, obj):
        return f'{obj.token_hash[:14]}...'

    @admin.display(description='Статус')
    def status_badge(self, obj):
        if obj.revoked_at:
            color = '#ff7f7f'
            label = 'Отозван'
        elif obj.expires_at <= timezone.now():
            color = '#f0b44c'
            label = 'Истек'
        else:
            color = '#7ddc8a'
            label = 'Активен'
        return format_html(
            '<span style="color:{}; font-weight:600;">{}</span>',
            color,
            label,
        )

    @admin.action(description='Отозвать выбранные токены')
    def revoke_selected_tokens(self, request, queryset):
        updated = queryset.filter(revoked_at__isnull=True).update(revoked_at=timezone.now())
        self.message_user(
            request,
            f'Отозвано токенов: {updated}',
            level=messages.WARNING,
        )
