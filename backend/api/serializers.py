from django.contrib.auth.models import AnonymousUser
from djoser.serializers import UserCreateSerializer
from drf_extra_fields.fields import Base64ImageField
from rest_framework import serializers
from rest_framework.exceptions import NotAuthenticated
from users.models import User


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
            'is_subscribed',
            'avatar',
        )

    def get_is_subscribed(self, obj):
        return False

    def to_representation(self, instance):
        if isinstance(instance, AnonymousUser):
            raise NotAuthenticated()
        return super().to_representation(instance)


class UserRegistrationSerializer(UserCreateSerializer):
    class Meta(UserCreateSerializer.Meta):
        model = User
        fields = (
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'age',
            'password',
        )
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'age': {'required': False, 'allow_null': True},
        }

class AvatarSerializer(serializers.Serializer):
    avatar = Base64ImageField(required=True)

    class Meta:
        fields = ('avatar',)

    def update(self, instance, validated_data):
        instance.avatar = validated_data.get('avatar', instance.avatar)
        instance.save()
        return instance
