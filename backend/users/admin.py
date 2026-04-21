from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class AdminUser(UserAdmin):
    list_display = (
        'id',
        'email',
        'username',
        'first_name',
        'last_name',
        'age',
        'is_active',
        'is_staff',
        'is_superuser',
    )
    search_fields = (
        'email',
        'username',
        'first_name',
        'last_name',
    )
    list_filter = (
        'is_active',
        'is_staff',
        'is_superuser',
        'groups',
    )
    ordering = ('id',)
    readonly_fields = ('last_login', 'date_joined')
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
                'fields': ('first_name', 'last_name', 'avatar'),
            },
        ),
        (
            'Дополнительно',
            {
                'fields': ('age',),
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
                    'password1',
                    'password2',
                    'is_active',
                    'is_staff',
                    'is_superuser',
                ),
            },
        ),
    )
