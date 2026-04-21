from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    REQUIRED_FIELDS = [
        'username',
        'first_name',
        'last_name',
    ]
    USERNAME_FIELD = 'email'

    email = models.EmailField(
        verbose_name='Электронная почта',
        unique=True,
    )

    avatar = models.ImageField(
        verbose_name='Аватар',
        upload_to='avatars/',
        blank=True,
        null=True,
    )
    age = models.PositiveSmallIntegerField(
        verbose_name='Возраст',
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
        ordering = ['username']

    def __str__(self):
        return self.username
