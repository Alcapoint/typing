from api.views import ViewSetUser
from django.urls import include, path
from rest_framework.routers import DefaultRouter

v1_router = DefaultRouter()

v1_router.register('users',
                   ViewSetUser,
                   basename='user')


urlpatterns = [
    path('', include(v1_router.urls)),
]
