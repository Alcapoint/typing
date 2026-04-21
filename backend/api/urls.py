from api.views import (UserAvatarView, ViewSetUser)
from django.urls import include, path
from rest_framework.routers import DefaultRouter

v1_router = DefaultRouter()

v1_router.register('users',
                   ViewSetUser,
                   basename='user')


urlpatterns = [
    path('', include(v1_router.urls)),
    path(
        'users/me/avatar/',
        UserAvatarView.as_view(),
        name='user-me-avatar'
    ),
]
