from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.password_validation import validate_password
from drf_extra_fields.fields import Base64ImageField
from rest_framework import serializers
from rest_framework.exceptions import NotAuthenticated
from users.models import User
from users.countries import COUNTRY_NAME_SET


class UserInfoSerializer(serializers.ModelSerializer):
    is_subscribed = serializers.SerializerMethodField(
        method_name='get_is_subscribed'
    )
    avatar = Base64ImageField(allow_null=True, required=False)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'age',
            'country',
            'is_subscribed',
            'avatar',
        )

    def get_is_subscribed(self, obj):
        return False

    def to_representation(self, instance):
        if isinstance(instance, AnonymousUser):
            raise NotAuthenticated()
        return super().to_representation(instance)

    def validate_country(self, value):
        if value in (None, ''):
            return None
        if value not in COUNTRY_NAME_SET:
            raise serializers.ValidationError('Выберите страну из списка.')
        return value


class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'password',
            'password_confirm',
        )

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', '')

        if password != password_confirm:
            raise serializers.ValidationError(
                {'password_confirm': 'Пароли должны совпадать.'}
            )

        candidate_user = User(username=attrs.get('username'))
        try:
            validate_password(password, user=candidate_user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': list(error.messages)}) from error
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class AvatarSerializer(serializers.Serializer):
    avatar = Base64ImageField(required=True)

    class Meta:
        fields = ('avatar',)

    def update(self, instance, validated_data):
        old_avatar_name = instance.avatar.name if instance.avatar and instance.avatar.name else None
        instance.avatar_upload_count = (instance.avatar_upload_count or 0) + 1
        instance.avatar = validated_data.get('avatar', instance.avatar)
        instance.save()
        if (
            old_avatar_name
            and old_avatar_name != instance.avatar.name
            and instance.avatar.storage.exists(old_avatar_name)
        ):
            instance.avatar.storage.delete(old_avatar_name)
        return instance
