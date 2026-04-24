import re
import uuid
from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

from .constants import (
    DEFAULT_TEXT_TYPE,
    MODE_STANDARD,
    TRAINING_SESSION_TTL_SECONDS,
)

User = get_user_model()
WORD_PATTERN = re.compile(r'\b\w+\b', re.UNICODE)


class Result(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='results'
    )
    speed = models.IntegerField()
    accuracy = models.FloatField()
    total_time = models.FloatField(default=0)
    training_text = models.TextField(blank=True, default='')
    language = models.ForeignKey(
        'Language',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='results'
    )
    user_text = models.ForeignKey(
        'UserText',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='results'
    )
    is_personal_text = models.BooleanField(default=False)
    words = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user or "guest"} - {self.speed} WPM'


def get_training_session_expiry():
    return timezone.now() + timezone.timedelta(
        seconds=TRAINING_SESSION_TTL_SECONDS
    )


class TrainingSession(models.Model):
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='training_sessions',
    )
    language = models.ForeignKey(
        'Language',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='training_sessions',
    )
    user_text = models.ForeignKey(
        'UserText',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='training_sessions',
    )
    training_text = models.TextField(blank=True, default='')
    text_type = models.CharField(max_length=16, default=DEFAULT_TEXT_TYPE)
    mode = models.CharField(max_length=16, default=MODE_STANDARD)
    requested_size = models.PositiveIntegerField(default=0)
    is_personal_text = models.BooleanField(default=False)
    client_fingerprint = models.CharField(max_length=64, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(default=get_training_session_expiry, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.token} ({self.user or "guest"})'


class Language(models.Model):
    code = models.CharField(max_length=10, unique=True, verbose_name='Код')
    name = models.CharField(max_length=100, verbose_name='Название')
    native_name = models.CharField(
        max_length=100,
        verbose_name='Название на языке'
    )
    flag_emoji = models.CharField(max_length=8, verbose_name='Флаг')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        ordering = ('sort_order', 'native_name')
        verbose_name = 'Язык'
        verbose_name_plural = 'Языки'

    def __str__(self):
        return self.native_name


class Text(models.Model):
    content = models.TextField()
    language = models.ForeignKey(
        Language,
        on_delete=models.PROTECT,
        related_name='texts',
        verbose_name='Язык'
    )

    class Meta:
        ordering = ('language__sort_order', 'id')
        verbose_name = 'Текст'
        verbose_name_plural = 'Тексты'

    def clean(self):
        super().clean()
        word_count = len(WORD_PATTERN.findall(self.content or ''))
        if word_count < 200:
            raise ValidationError({
                'content': 'Текст должен содержать минимум 200 слов.'
            })

    def __str__(self):
        return f"{self.language.native_name}: {self.content[:30]}"


class UserText(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trainer_texts',
        verbose_name='Пользователь'
    )
    title = models.CharField(max_length=120, verbose_name='Название')
    content = models.TextField(verbose_name='Текст')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at', '-id')
        verbose_name = 'Пользовательский текст'
        verbose_name_plural = 'Пользовательские тексты'

    def clean(self):
        super().clean()
        word_count = len(WORD_PATTERN.findall(self.content or ''))
        if word_count < 10:
            raise ValidationError({
                'content': 'Пользовательский текст должен содержать минимум 10 слов.'
            })

    def __str__(self):
        return f'{self.user.username}: {self.title}'


class HelpSection(models.Model):
    title = models.CharField(max_length=120, verbose_name='Название')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        ordering = ('sort_order', 'id')
        verbose_name = 'Раздел подсказок'
        verbose_name_plural = 'Разделы подсказок'

    def __str__(self):
        return self.title


class HelpItem(models.Model):
    section = models.ForeignKey(
        HelpSection,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Раздел'
    )
    text = models.CharField(max_length=255, verbose_name='Текст')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        ordering = ('sort_order', 'id')
        verbose_name = 'Подсказка'
        verbose_name_plural = 'Подсказки'

    def __str__(self):
        return self.text
