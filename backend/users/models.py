from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def user_avatar_upload_path(instance, filename):
    username = slugify(instance.username or "user") or "user"
    uploaded_at = timezone.localtime().strftime("%Y%m%d")
    avatar_number = max((instance.avatar_upload_count or 0), 1)
    extension = (filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'png')
    return f"avatars/{username}_{uploaded_at}_{avatar_number}.{extension}"


class User(AbstractUser):
    REQUIRED_FIELDS = [
        'username',
    ]
    USERNAME_FIELD = 'email'

    email = models.EmailField(
        verbose_name='Электронная почта',
        unique=True,
    )

    avatar = models.ImageField(
        verbose_name='Аватар',
        upload_to=user_avatar_upload_path,
        blank=True,
        null=True,
    )
    avatar_upload_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество загруженных аватаров',
    )
    age = models.PositiveSmallIntegerField(
        verbose_name='Возраст',
        blank=True,
        null=True,
    )
    country = models.CharField(
        verbose_name='Страна проживания',
        max_length=120,
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
        ordering = ['username']

    def __str__(self):
        return self.username


class SessionToken(models.Model):
    ACCESS = 'access'
    REFRESH = 'refresh'
    TOKEN_TYPES = (
        (ACCESS, 'Access'),
        (REFRESH, 'Refresh'),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='session_tokens',
    )
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    token_type = models.CharField(max_length=16, choices=TOKEN_TYPES, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Сессионный токен'
        verbose_name_plural = 'Сессионные токены'

    def __str__(self):
        return f'{self.user.email} / {self.token_type}'

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_at > timezone.now()
