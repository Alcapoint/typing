from djoser.views import UserViewSet
from rest_framework import parsers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models import User
from .serializers import (
    AvatarSerializer,
    UserInfoSerializer,
    UserRegistrationSerializer,
)


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
