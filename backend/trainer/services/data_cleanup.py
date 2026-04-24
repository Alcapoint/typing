from django.utils import timezone

from users.models import SessionToken

from ..models import TrainingSession


def cleanup_stale_records():
    now = timezone.now()

    deleted_training_sessions, _ = TrainingSession.objects.filter(
        expires_at__lte=now,
    ).delete()

    deleted_session_tokens, _ = SessionToken.objects.filter(
        expires_at__lte=now,
    ).delete()

    return {
        'training_sessions': deleted_training_sessions,
        'session_tokens': deleted_session_tokens,
    }
