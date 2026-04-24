import hashlib
from uuid import UUID

from django.utils import timezone
from rest_framework import serializers

from ..constants import (
    MAX_ALLOWED_CPM,
    MAX_ALLOWED_WPM,
    TRAINING_SESSION_TTL_SECONDS,
)
from ..models import Result, TrainingSession
from .text_generation import get_word_count, normalize_spaces


def get_client_fingerprint(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    client_ip = forwarded_for.split(',')[0].strip() if forwarded_for else (
        request.META.get('REMOTE_ADDR', '') or ''
    )
    user_agent = request.META.get('HTTP_USER_AGENT', '') or ''
    return hashlib.sha256(f'{client_ip}|{user_agent}'.encode('utf-8')).hexdigest()


def get_training_session(request, session_token, *, allow_completed=False):
    if not session_token:
        raise serializers.ValidationError('Не найдена активная тренировочная сессия.')

    try:
        token = UUID(str(session_token))
    except (TypeError, ValueError):
        raise serializers.ValidationError('Некорректный токен тренировочной сессии.')

    session = TrainingSession.objects.select_related('user', 'language', 'user_text').filter(
        token=token,
    ).first()
    if not session:
        raise serializers.ValidationError('Тренировочная сессия не найдена.')

    if session.expires_at <= timezone.now():
        raise serializers.ValidationError('Тренировочная сессия истекла. Загрузите новый текст.')

    if session.completed_at and not allow_completed:
        raise serializers.ValidationError('Эта тренировочная сессия уже завершена.')

    if session.user_id:
        if not request.user.is_authenticated or session.user_id != request.user.id:
            raise serializers.ValidationError('Сессия принадлежит другому пользователю.')
    elif session.client_fingerprint != get_client_fingerprint(request):
        raise serializers.ValidationError('Сессия принадлежит другому клиенту.')

    return session


def get_active_training_session(request, session_token):
    return get_training_session(request, session_token, allow_completed=False)


def rebuild_typed_input(words):
    return ' '.join(word['typed'] for word in words)


def get_typed_error_count(value, text):
    mismatch_count = 0
    for index, character in enumerate(value):
        if character != text[index]:
            mismatch_count += 1
    return mismatch_count


def validate_and_normalize_words(training_text, words):
    if not isinstance(words, list) or not words:
        raise serializers.ValidationError('Не удалось проверить результат: список слов пуст.')

    source_words = training_text.split(' ')
    if len(words) > len(source_words):
        raise serializers.ValidationError('Результат содержит больше слов, чем выданный текст.')

    normalized_words = []
    for index, item in enumerate(words):
        if not isinstance(item, dict):
            raise serializers.ValidationError('Некорректный формат статистики по словам.')

        correct = str(item.get('correct', ''))
        typed = str(item.get('typed', ''))
        if correct != source_words[index]:
            raise serializers.ValidationError('Результат не соответствует выданному тексту.')
        if len(typed) > len(correct):
            raise serializers.ValidationError('Некорректная длина набранного слова.')

        try:
            duration = float(item.get('duration', 0) or 0)
        except (TypeError, ValueError):
            raise serializers.ValidationError('Некорректная длительность слова.')

        if duration < 0:
            raise serializers.ValidationError('Длительность слова не может быть отрицательной.')

        normalized_words.append({
            'correct': correct,
            'typed': typed,
            'duration': duration,
        })

    typed_input = rebuild_typed_input(normalized_words)
    if len(typed_input) > len(training_text):
        raise serializers.ValidationError('Набранный текст длиннее выданного текста.')

    return normalized_words, typed_input


def build_verified_result_payload(training_text, words, total_time):
    normalized_words, typed_input = validate_and_normalize_words(training_text, words)

    try:
        total_time_value = float(total_time)
    except (TypeError, ValueError):
        raise serializers.ValidationError('Некорректное общее время тренировки.')

    if total_time_value <= 0:
        raise serializers.ValidationError('Время тренировки должно быть больше нуля.')

    typed_errors = get_typed_error_count(typed_input, training_text)
    speed = round((len(typed_input) / 5) / (total_time_value / 60)) if typed_input else 0
    cpm = round(len(typed_input) / (total_time_value / 60)) if typed_input else 0
    accuracy = round(
        (((len(typed_input) - typed_errors) / len(typed_input)) * 100),
        1,
    ) if typed_input else 100

    for word in normalized_words:
        base_chars_count = max(len(word['correct']), len(word['typed']), 1)
        safe_duration = max(word['duration'], 0.5)
        minutes = safe_duration / 60
        word['wpm'] = round((base_chars_count / 5) / minutes)
        word['cpm'] = round(base_chars_count / minutes)
        word['errors'] = sum(
            1
            for index in range(max(len(word['correct']), len(word['typed'])))
            if (word['correct'][index] if index < len(word['correct']) else '')
            != (word['typed'][index] if index < len(word['typed']) else '')
        )

    if speed > MAX_ALLOWED_WPM or cpm > MAX_ALLOWED_CPM:
        raise serializers.ValidationError('Результат отклонён как нереалистичный.')

    return {
        'total_time': total_time_value,
        'speed': speed,
        'accuracy': round(accuracy, 1),
        'words': normalized_words,
        'typed_input': typed_input,
    }


def validate_session_result_timing(session, total_time):
    reference_started_at = session.started_at or session.created_at
    server_elapsed = (timezone.now() - reference_started_at).total_seconds()
    if total_time - server_elapsed > 1:
        raise serializers.ValidationError('Общее время результата превышает длительность сессии.')


def validate_replay_session_request(request, training_text, language, user_text, is_personal_text):
    normalized_text = normalize_spaces(training_text)
    if get_word_count(normalized_text) < 10:
        raise serializers.ValidationError('Для защищённой сессии нужно минимум 10 слов.')

    if user_text:
        if user_text.user_id != request.user.id:
            raise serializers.ValidationError('Нельзя повторять чужой пользовательский текст.')
        if normalize_spaces(user_text.content) != normalized_text:
            raise serializers.ValidationError('Текст повтора не совпадает с исходным пользовательским текстом.')
        return normalized_text

    result_exists = Result.objects.filter(
        user=request.user,
        training_text=normalized_text,
        is_personal_text=bool(is_personal_text),
        language=language,
    ).exists()
    if not result_exists:
        raise serializers.ValidationError('Можно повторять только свои сохранённые тренировки.')

    return normalized_text


def create_training_session(
    *,
    request,
    training_text,
    language,
    text_type,
    mode,
    requested_size,
    user_text=None,
    is_personal_text=False,
):
    return TrainingSession.objects.create(
        user=request.user if request.user.is_authenticated else None,
        language=language,
        user_text=user_text,
        training_text=normalize_spaces(training_text),
        text_type=text_type,
        mode=mode,
        requested_size=requested_size or 0,
        is_personal_text=is_personal_text,
        client_fingerprint=get_client_fingerprint(request),
    )


def append_training_session_text(session, appended_text):
    session.training_text = normalize_spaces(f'{session.training_text} {appended_text}')
    session.expires_at = timezone.now() + timezone.timedelta(
        seconds=TRAINING_SESSION_TTL_SECONDS
    )
    session.save(update_fields=['training_text', 'expires_at'])
    return session


def start_training_session(session):
    if session.started_at:
        return session
    session.started_at = timezone.now()
    session.save(update_fields=['started_at'])
    return session


def complete_training_session(session):
    session.completed_at = timezone.now()
    session.save(update_fields=['completed_at'])
    return session


def restart_training_session(request, session_token):
    session = get_training_session(request, session_token, allow_completed=True)
    return create_training_session(
        request=request,
        training_text=session.training_text,
        language=session.language,
        text_type=session.text_type,
        mode=session.mode,
        requested_size=session.requested_size,
        user_text=session.user_text,
        is_personal_text=session.is_personal_text,
    )
