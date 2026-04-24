from django.contrib.auth import get_user_model
from djoser.views import UserViewSet
from rest_framework import parsers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.exceptions import AuthenticationFailed
from users.models import User
from users.countries import COUNTRY_NAMES
from .serializers import (
    AvatarSerializer,
    UserInfoSerializer,
    UserRegistrationSerializer,
)
from .services.auth_tokens import (
    clear_refresh_cookie,
    issue_token_pair,
    refresh_access_token,
    revoke_token,
    revoke_token_by_raw_value,
    set_refresh_cookie,
    validate_access_token,
)

UserModel = get_user_model()


class ViewSetUser(UserViewSet):
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve', 'me'):
            return UserInfoSerializer
        if self.action == 'create':
            return UserRegistrationSerializer
        return super().get_serializer_class()

    @action(
        methods=['put', 'delete'],
        detail=False,
        url_path='me/avatar',
        permission_classes=[IsAuthenticated],
        parser_classes=[parsers.JSONParser]
    )
    def avatar(self, request, *args, **kwargs):
        user = request.user
        if request.method == 'PUT':
            serializer = AvatarSerializer(user, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            if not user.avatar or not user.avatar.name:
                return Response(
                    {'detail': 'Нет аватара.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.avatar.delete(save=True)
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['POST'])
def token_login(request):
    login_value = (
        request.data.get('email')
        or request.data.get('username')
        or request.data.get('login')
        or ''
    ).strip()
    password = request.data.get('password') or ''

    if not login_value or not password:
        return Response(
            {'detail': 'Укажите email или username и пароль.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = UserModel.objects.filter(email__iexact=login_value).first()
    if not user:
        user = UserModel.objects.filter(username__iexact=login_value).first()

    if not user or not user.check_password(password):
        return Response(
            {'detail': 'Неверные учетные данные.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.is_active:
        return Response(
            {'detail': 'Пользователь деактивирован.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token_pair = issue_token_pair(user)
    response = Response(
        {'access_token': token_pair['access_token']},
        status=status.HTTP_200_OK,
    )
    return set_refresh_cookie(
        response,
        token_pair['refresh_token'],
        token_pair['refresh_expires_at'],
    )


@api_view(['POST'])
def token_refresh(request):
    csrf_token = request.headers.get('X-CSRF-Token') or ''
    refresh_token = request.COOKIES.get('refresh_token') or ''

    token_pair = refresh_access_token(csrf_token, refresh_token)
    response = Response(
        {'access_token': token_pair['access_token']},
        status=status.HTTP_200_OK,
    )
    return set_refresh_cookie(
        response,
        token_pair['refresh_token'],
        token_pair['refresh_expires_at'],
    )


@api_view(['POST'])
def token_logout(request):
    auth_header = request.headers.get('Authorization', '')
    parts = auth_header.split()
    if len(parts) == 2 and parts[0] == 'Bearer':
        try:
            revoke_token(validate_access_token(parts[1], allow_expired=True, grace_seconds=0))
        except AuthenticationFailed:
            pass

    refresh_token = request.COOKIES.get('refresh_token') or ''
    revoke_token_by_raw_value(refresh_token, 'refresh')

    response = Response(status=status.HTTP_204_NO_CONTENT)
    return clear_refresh_cookie(response)


@api_view(['GET'])
def country_list(request):
    return Response(COUNTRY_NAMES, status=status.HTTP_200_OK)
