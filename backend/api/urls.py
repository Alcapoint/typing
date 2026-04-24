from api.views import (
    ViewSetUser,
    country_list,
    token_login,
    token_logout,
    token_refresh,
)
from django.urls import include, path
from rest_framework.routers import DefaultRouter

v1_router = DefaultRouter()

v1_router.register('users',
                   ViewSetUser,
                   basename='user')


urlpatterns = [
    path('auth/token/login/', token_login),
    path('auth/token/refresh/', token_refresh),
    path('auth/token/logout/', token_logout),
    path('countries/', country_list),
    path('', include(v1_router.urls)),
]
