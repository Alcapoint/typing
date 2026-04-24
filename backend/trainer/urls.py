from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from .views import (
    history,
    history_detail,
    help_sections,
    language_list,
    leaderboard,
    leaderboard_user_detail,
    random_text,
    save_result,
    replay_training_session,
    restart_training_session,
    start_training_session,
    user_text_detail,
    user_texts,
)


urlpatterns = [
    path('help-sections/', help_sections),
    path('languages/', language_list),
    path('text/', random_text),
    path('result/', save_result),
    path('training-sessions/replay/', replay_training_session),
    path('training-sessions/<uuid:session_token>/restart/', restart_training_session),
    path('training-sessions/<uuid:session_token>/start/', start_training_session),
    path('user-texts/', user_texts),
    path('user-texts/<int:text_id>/', user_text_detail),
    path('leaderboard/', leaderboard),
    path('leaderboard/<int:user_id>/', leaderboard_user_detail),
    path('history/', history),
    path('history/<int:result_id>/', history_detail),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
