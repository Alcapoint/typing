from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.views.static import serve
from django.urls import path, include


def root_view(request):
    return JsonResponse(
        {
            'status': 'ok',
            'message': 'Foodgram backend is running',
            'api': '/api/',
            'admin': '/admin/',
        }
    )


urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('api/', include('trainer.urls')),
    path('api/', include('api.urls')),
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.authtoken')),
]

if not settings.DEBUG:
    urlpatterns += [
        path(
            'media/<path:path>',
            serve,
            {'document_root': settings.MEDIA_ROOT}
        ),
    ]
